/**
 * Sistema de autenticação usando Supabase
 */
class AuthenticationManager {
  constructor() {
    this.supabaseUrl = 'https://kutxudxeifdvtfqyjlql.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dHh1ZHhlaWZkdnRmcXlqbHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2OTc3MjQsImV4cCI6MjA2MjI3MzcyNH0.eVFutWIN4mYua0jb0DjEu0WYGnMO19DiaNpEN9Uq5oQ';
    this.currentUser = null;
    this.userProfile = null;
    this.privilegeLevel = null;
    this.authStateListeners = [];
    
    // Inicializar em um timeout para garantir que o script Supabase foi carregado
    setTimeout(() => {
      this.initializeSupabase();
      this.setupAuthStateChangeListener();
    }, 500);
  }
  
  initializeSupabase() {
    // Verificar se o script Supabase está carregado
    if (!window.supabase) {
      console.error('Supabase client não foi carregado! Tentando novamente em 1 segundo...');
      setTimeout(() => this.initializeSupabase(), 1000);
      return;
    }
    
    try {
      console.log('Inicializando cliente Supabase...');
      this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
      console.log('Cliente Supabase inicializado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
    }
  }
  
  // Corrija o método setupAuthStateChangeListener
  async setupAuthStateChangeListener() {
    if (!this.supabase) {
      console.error('Erro: Supabase não inicializado ao configurar listener');
      return;
    }
    
    console.log('Configurando listener para mudanças de estado de autenticação...');
    
    try {
      // Flag para evitar loops de autenticação
      let isProcessingAuthEvent = false;
      
      // Configurar listener para mudanças no estado de autenticação
      const { data: authListener } = this.supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Evento de autenticação:', event, !!session);
          
          // Evitar processamento duplicado
          if (isProcessingAuthEvent) {
            console.warn('Já processando outro evento de autenticação. Ignorando este evento.');
            return;
          }
          
          isProcessingAuthEvent = true;
          
          try {
            // Atualizar estado da autenticação
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (!session) {
                console.warn('Evento de login sem sessão!');
                isProcessingAuthEvent = false;
                return;
              }
              
              console.log('Usuário autenticado via evento:', session.user.email);
              this.currentUser = session.user;
              await this.fetchUserProfile();
              this.notifyAuthStateChanged(true);
            } else if (event === 'SIGNED_OUT') {
              console.log('Usuário deslogado');
              this.currentUser = null;
              this.userProfile = null;
              this.privilegeLevel = null;
              this.notifyAuthStateChanged(false);
            }
          } finally {
            isProcessingAuthEvent = false;
          }
        }
      );

      console.log('Listener configurado com sucesso');

      // Verificar se usuário já está autenticado
      console.log('Verificando sessão existente...');
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session) {
        console.log('Sessão existente encontrada para:', session.user.email);
        this.currentUser = session.user;
        await this.fetchUserProfile();
        
        // Importante: armazenar os dados do usuário na sessão aqui
        if (this.userProfile) {
          sessionStorage.setItem('userProfile', JSON.stringify(this.userProfile));
        }
        
        this.notifyAuthStateChanged(true);
      } else {
        console.log('Nenhuma sessão existente');
      }
    } catch (error) {
      console.error('Erro ao configurar listener de autenticação:', error);
    }
  }
  
  // Corrija o método fetchUserProfile
  async fetchUserProfile() {
    if (!this.currentUser) {
      console.warn('Tentativa de buscar perfil sem usuário autenticado');
      return null;
    }
    
    try {
      console.log('Buscando perfil para usuário:', this.currentUser.id);
      
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error) {
        console.error('Erro do Supabase ao buscar perfil:', error);
        
        // Verificar primeiro se temos um perfil salvo anteriormente
        const savedProfile = localStorage.getItem('user_profile_' + this.currentUser.id);
        if (savedProfile) {
          try {
            this.userProfile = JSON.parse(savedProfile);
            this.privilegeLevel = this.userProfile.privilege_level;
            console.log('Usando perfil salvo anteriormente:', this.userProfile);
            
            // Salvar no sessionStorage para uso imediato
            sessionStorage.setItem('userProfile', savedProfile);
            return this.userProfile;
          } catch (parseError) {
            console.error('Erro ao analisar perfil salvo:', parseError);
          }
        }
        
        return null;
      }
      
      if (data) {
        console.log('Perfil encontrado:', data);
        this.userProfile = data;
        this.privilegeLevel = data.privilege_level;
        
        // Salvar no localStorage para persistência entre sessões
        localStorage.setItem('user_profile_' + this.currentUser.id, JSON.stringify(data));
        
        // Salvar no sessionStorage para acesso rápido
        sessionStorage.setItem('userProfile', JSON.stringify(data));
      } else {
        console.warn('Nenhum perfil encontrado para o usuário');
        
        // Criar perfil básico como fallback
        this.userProfile = {
          id: this.currentUser.id,
          email: this.currentUser.email,
          full_name: this.currentUser.user_metadata?.full_name || 'Usuário',
          privilege_level: 'common user'
        };
        this.privilegeLevel = 'common user';
        
        // Armazenar o perfil básico também
        sessionStorage.setItem('userProfile', JSON.stringify(this.userProfile));
        localStorage.setItem('user_profile_' + this.currentUser.id, JSON.stringify(this.userProfile));
      }
      
      return this.userProfile;
    } catch (error) {
      console.error('Exceção ao buscar perfil do usuário:', error);
      
      // Tentar recuperar do localStorage como último recurso
      try {
        const savedProfile = localStorage.getItem('user_profile_' + this.currentUser.id);
        if (savedProfile) {
          this.userProfile = JSON.parse(savedProfile);
          this.privilegeLevel = this.userProfile.privilege_level;
          sessionStorage.setItem('userProfile', savedProfile);
          return this.userProfile;
        }
      } catch (e) {
        console.error('Falha ao recuperar perfil do localStorage:', e);
      }
      
      // Criar um perfil básico para não bloquear o login
      this.userProfile = {
        id: this.currentUser.id,
        email: this.currentUser.email,
        full_name: this.currentUser.email.split('@')[0] || 'Usuário',
        privilege_level: 'common user'
      };
      this.privilegeLevel = 'common user';
      
      // Salvar este perfil básico
      sessionStorage.setItem('userProfile', JSON.stringify(this.userProfile));
      
      return this.userProfile;
    }
  }
  
  async signUp(email, password, fullName) {
    try {
      console.log('Tentando registrar usuário:', email);
      
      // Verificar se há um cooldown ativo
      const cooldownKey = `auth_signup_cooldown`;
      const cooldownUntil = localStorage.getItem(cooldownKey);
      
      if (cooldownUntil && new Date().getTime() < parseInt(cooldownUntil)) {
        const remainingSeconds = Math.ceil((parseInt(cooldownUntil) - new Date().getTime()) / 1000);
        return { 
          success: false, 
          error: { 
            message: `Por favor, aguarde ${remainingSeconds} segundos antes de tentar novamente.`,
            name: 'RateLimitError',
            remainingSeconds 
          } 
        };
      }
      
      // Registrar usuário na autenticação
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      
      // Verificar se é erro de rate limit
      if (authError) {
        if (authError.message && authError.message.includes('you can only request this after')) {
          // Extrair o número de segundos do erro
          const secondsMatch = authError.message.match(/after (\d+) seconds/);
          const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 30;
          
          // Armazenar o cooldown para prevenir tentativas repetidas
          const cooldownTime = new Date().getTime() + (seconds * 1000);
          localStorage.setItem(cooldownKey, cooldownTime.toString());
          
          return { 
            success: false, 
            error: { 
              message: `Por favor, aguarde ${seconds} segundos antes de tentar novamente.`,
              name: 'RateLimitError',
              remainingSeconds: seconds
            } 
          };
        }
        
        throw authError;
      }
      
      // Se registro bem-sucedido, criar perfil de usuário
      if (authData.user) {
        console.log('Criando perfil de usuário para:', authData.user.id);
        try {
          // Usar configuração explícita de cabeçalhos para tentar contornar problema de RLS
          const { error: profileError } = await this.supabase
            .from('user_profiles')
            .insert([
              { 
                id: authData.user.id,
                email: email,
                full_name: fullName,
                privilege_level: 'common user' // Nível padrão
              }
            ]);
        
          if (profileError) {
            console.error('Erro ao criar perfil:', profileError);
            
            // Ainda consideramos o registro bem-sucedido se o usuário foi criado
            // mas houve erro no perfil - isso pode ser corrigido depois
            return { 
              success: true, 
              user: authData.user, 
              warning: 'Conta criada, mas houve um problema ao configurar seu perfil. Entre em contato com o suporte.' 
            };
          }
          
          console.log('Usuário registrado com sucesso!');
          return { success: true, user: authData.user };
        }
        catch (profileError) {
          console.error('Exceção ao criar perfil:', profileError);
          
          // Retorna sucesso mesmo com falha no perfil para permitir nova tentativa depois
          return { 
            success: true, 
            user: authData.user, 
            warning: 'Conta criada, mas houve um problema ao configurar seu perfil. Entre em contato com o suporte.' 
          };
        }
      }
      
      return { success: false, error: new Error('Erro desconhecido no registro') };
    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, error };
    }
  }
  
  // Substitua o método signIn por esta versão melhorada:
  async signIn(email, password) {
    try {
      // Verificar se já estamos autenticados com o mesmo email
      if (this.currentUser && this.currentUser.email === email) {
        console.log('Usuário já está autenticado com este email:', email);
        
        // Tentar buscar o perfil se ainda não temos
        if (!this.userProfile) {
          await this.fetchUserProfile();
          
          if (this.userProfile) {
            sessionStorage.setItem('userProfile', JSON.stringify(this.userProfile));
          }
        }
        
        // Notificar que estamos autenticados (não tente fazer login novamente)
        this.notifyAuthStateChanged(true);
        return { success: true, user: this.currentUser };
      }
      
      console.log('Iniciando processo de login para:', email);
      
      // Tente fazer login
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Erro na autenticação do Supabase:', error);
        throw error;
      }
      
      console.log('Autenticação bem-sucedida, buscando perfil de usuário...');
      this.currentUser = data.user;
      
      // Forçar um pequeno atraso antes de buscar perfil para permitir que o banco de dados se atualize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Buscar perfil de usuário
      try {
        await this.fetchUserProfile();
        console.log('Perfil do usuário carregado:', this.userProfile);
      } catch (profileError) {
        console.error('Erro ao carregar perfil do usuário:', profileError);
        // Continuar mesmo sem o perfil
      }
      
      // Salvar dados do usuário na sessão
      if (this.userProfile) {
        sessionStorage.setItem('userProfile', JSON.stringify(this.userProfile));
      } else {
        // Se não conseguiu carregar o perfil, pelo menos salvar os dados básicos
        sessionStorage.setItem('userBasicInfo', JSON.stringify({
          id: this.currentUser.id,
          email: this.currentUser.email
        }));
      }
      
      // Notificar mudança de estado INDEPENDENTE do resultado do fetchUserProfile
      console.log('Notificando mudança para estado autenticado...');
      this.notifyAuthStateChanged(true);
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Erro no processo de login:', error);
      return { success: false, error };
    }
  }
  
  // Substitua o método signOut() existente:
  async signOut() {
    try {
      console.log('Executando signOut na Supabase...');
      
      // 1. Primeiro limpar estado local para evitar conflitos
      this.currentUser = null;
      this.userProfile = null;
      this.privilegeLevel = null;
      
      // 2. Limpar dados de sessão - importante fazer antes da chamada à API
      console.log('Limpando dados de sessão...');
      sessionStorage.removeItem('userProfile');
      sessionStorage.removeItem('userBasicInfo');
      
      // 3. Chamar a API do Supabase para fazer logout
      console.log('Executando API de logout...');
      try {
        const { error } = await this.supabase.auth.signOut();
        
        if (error) {
          console.error('Erro no Supabase signOut:', error);
        } else {
          console.log('Logout Supabase bem-sucedido');
        }
      } catch (supabaseError) {
        // Continuar mesmo se houver erro na API
        console.error('Falha na API de logout do Supabase:', supabaseError);
      }
      
      // 4. Garantir limpeza do localStorage
      console.log('Limpando tokens do localStorage...');
      try {
        // Obter lista de chaves antes de começar a remoção para evitar problemas de iteração
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
          }
        }
        
        // Remover as chaves encontradas
        keysToRemove.forEach(key => {
          console.log('Removendo token:', key);
          localStorage.removeItem(key);
        });
      } catch (storageError) {
        console.error('Erro ao limpar localStorage:', storageError);
      }
      
      // 5. Notificar mudança de estado - importante para atualizar a UI
      console.log('Notificando mudança para estado deslogado...');
      this.notifyAuthStateChanged(false);
      
      return { success: true };
    } catch (error) {
      console.error('Erro no processo de logout:', error);
      
      // Ainda assim tentar notificar mudança de estado
      this.notifyAuthStateChanged(false);
      
      return { success: false, error };
    }
  }
  
  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        email, 
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao solicitar reset de senha:', error);
      return { success: false, error };
    }
  }
  
  isAuthenticated() {
    return !!this.currentUser;
  }
  
  getCurrentUser() {
    return this.currentUser;
  }
  
  getUserProfile() {
    return this.userProfile;
  }
  
  getPrivilegeLevel() {
    return this.privilegeLevel;
  }
  
  hasPrivilege(requiredLevel) {
    const privilegeHierarchy = {
      'master admin': 4,
      'admin': 3,
      'user': 2,
      'common user': 1
    };
    
    const userLevel = privilegeHierarchy[this.privilegeLevel] || 0;
    const required = privilegeHierarchy[requiredLevel] || 0;
    
    return userLevel >= required;
  }
  
  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.authStateListeners.push(callback);
      
      // Retornar função para remover o listener
      return () => {
        this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
      };
    }
  }
  
  notifyAuthStateChanged(isAuthenticated) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(isAuthenticated, this.currentUser, this.userProfile);
      } catch (error) {
        console.error('Erro em listener de autenticação:', error);
      }
    });
  }
}

// Criar instância global
window.authManager = new AuthenticationManager();