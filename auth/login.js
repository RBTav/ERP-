/**
 * Controlador da interface de login
 */
class LoginManager {
  constructor() {
    this.currentView = 'login'; // login, register, forgot-password
    this.authContainer = null;
    this.mainContent = null;
    this.loginForm = null;
    this.registerForm = null;
    this.forgotPasswordForm = null;
    
    // Verificar se há uma sessão global detectada
    if (window.hasExistingSession === true) {
      console.log('Sessão detectada no construtor, verificando se é válida...');
      
      // Verificação adicional: confirmar que authManager também está autenticado
      if (window.authManager && window.authManager.supabase) {
        // Verificar assincronamente a sessão no Supabase
        window.authManager.supabase.auth.getSession().then(({ data }) => {
          if (data && data.session) {
            console.log('Sessão Supabase confirma autenticação, pulando criação da interface');
            this.mainContent = document.getElementById('app-content') || document.body;
            
            // Adicionar o listener para mudança de estado de autenticação
            window.authManager.onAuthStateChanged((isAuthenticated) => {
              if (isAuthenticated && typeof forceShowMainInterface === 'function') {
                forceShowMainInterface();
              }
            });
            
            // Chamar forceShowMainInterface para garantir
            if (typeof forceShowMainInterface === 'function') {
              setTimeout(forceShowMainInterface, 100);
            }
          } else {
            console.log('Sessão inválida detectada, mostrando tela de login');
            // Limpar dados de sessão inconsistentes
            localStorage.removeItem('auth_session_active');
            sessionStorage.removeItem('userProfile');
            window.hasExistingSession = false;
            
            // Inicializar interface de login
            this.initializeInterface();
            if (this.authContainer) {
              this.addEventListeners();
            }
          }
        });
        
        return; // Esperar pela verificação assíncrona
      } else {
        // Se authManager não estiver disponível, confiar no flag de sessão
        this.mainContent = document.getElementById('app-content') || document.body;
        
        // Tentar mostrar a interface principal quando authManager estiver disponível
        const checkAuthManager = setInterval(() => {
          if (window.authManager) {
            clearInterval(checkAuthManager);
            
            window.authManager.onAuthStateChanged((isAuthenticated) => {
              if (isAuthenticated && typeof forceShowMainInterface === 'function') {
                forceShowMainInterface();
              }
            });
          }
        }, 100);
        
        return; // Sair do construtor sem inicializar interface
      }
    }
    
    // Adiar a inicialização para garantir que o DOM esteja pronto
    setTimeout(() => {
      this.initializeInterface();
      // addEventListeners só será chamado se a interface for criada
      if (this.authContainer) {
        this.addEventListeners();
      }
    }, 100);
  }
  
  checkForExistingSession() {
    try {
      const userProfile = sessionStorage.getItem('userProfile');
      if (userProfile) {
        // Usuário já está autenticado, mostrar interface principal diretamente
        console.log('Sessão ativa encontrada, aplicando imediatamente...');
        
        // O authContainer ainda não existe, então vamos adiar sua manipulação
        setTimeout(() => {
          // Referência ao conteúdo principal 
          this.mainContent = document.getElementById('app-content') || document.body;
          
          // Mostrar interface principal e informações do usuário
          if (typeof forceShowMainInterface === 'function') {
            forceShowMainInterface();
          }
        }, 0);
        
        return true;
      }
    } catch (e) {
      console.error('Erro ao verificar sessão existente:', e);
    }
    
    return false;
  }
  
  initializeInterface() {
    console.log('Inicializando interface de login...');
    
    // Verificar primeiro a flag global de sessão
    if (window.hasExistingSession === true) {
      console.log('Flag global de sessão detectada, pulando criação da interface de login');
      
      // Configurar referência ao conteúdo principal para uso posterior
      this.mainContent = document.getElementById('app-content') || document.body;
      
      // Mostrar a interface principal imediatamente
      setTimeout(() => {
        if (typeof forceShowMainInterface === 'function') {
          forceShowMainInterface();
        }
      }, 0);
      
      return; // Sair sem criar interface de login
    }
    
    // Verificar também o método existente como fallback
    if (this.checkForExistingSession()) {
      console.log('Sessão existente detectada, pulando criação da interface de login');
      return;
    }
    
    // Buscar o container de autenticação existente em vez de criar um novo
    this.authContainer = document.getElementById('auth-container');
    
    // Se o container não existir (pode acontecer se auth-loader.js falhar), criar um
    if (!this.authContainer) {
      console.log('Criando container de autenticação (fallback)');
      this.authContainer = document.createElement('div');
      this.authContainer.classList.add('auth-container');
      this.authContainer.id = 'auth-container';
      document.body.insertBefore(this.authContainer, document.body.firstChild);
    } else {
      console.log('Usando container de autenticação existente');
    }
    
    // Limpar o conteúdo existente (caso tenha sido criado pelo auth-loader)
    this.authContainer.innerHTML = '';
    
    // Construir a interface de autenticação
    this.buildLoginInterface();
    this.buildRegisterInterface();
    this.buildForgotPasswordInterface();
    
    // Referenciar o conteúdo principal do app
    this.mainContent = document.getElementById('app-content') || document.body;
    
    // Garantir que os elementos foram encontrados
    console.log('Elementos criados:', {
      loginForm: !!this.loginForm,
      registerForm: !!this.registerForm,
      forgotPasswordForm: !!this.forgotPasswordForm
    });
    
    // Pequeno atraso para garantir que os elementos estejam disponíveis no DOM
    setTimeout(() => {
      // Tentar encontrar os elementos novamente se necessário
      if (!this.loginForm) this.loginForm = document.getElementById('login-form');
      if (!this.registerForm) this.registerForm = document.getElementById('register-form');
      if (!this.forgotPasswordForm) this.forgotPasswordForm = document.getElementById('forgot-password-form');
      
      // Se o usuário já está autenticado, ocultar o formulário
      this.checkAuthState();
    }, 100);
  }
  
  buildLoginInterface() {
    // Verificar se o usuário já está autenticado antes de criar o formulário
    if (sessionStorage.getItem('userProfile')) {
      console.log('Perfil encontrado em sessão, pulando criação do login form');
      return; // Não criar o form de login se já estiver autenticado
    }
    
    const loginHtml = `
      <div class="login-container" id="login-form">
        <div class="auth-header">
          <div class="auth-logo">
            <span>ERT</span>
          </div>
          <h2>Entrar no Sistema</h2>
        </div>
        <div class="input-group">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" class="input-field" placeholder="seu@email.com">
          <div class="error-message" id="login-email-error"></div>
        </div>
        <div class="input-group">
          <label for="login-password">Senha</label>
          <input type="password" id="login-password" class="input-field" placeholder="Sua senha">
          <div class="error-message" id="login-password-error"></div>
        </div>
        <button class="auth-button" id="login-button">Entrar</button>
        <div class="auth-links">
          <a href="#" id="forgot-password-link">Esqueceu a senha?</a>
          <a href="#" id="register-link">Criar conta</a>
        </div>
        <div class="error-message" id="login-general-error"></div>
      </div>
    `;
    
    this.authContainer.insertAdjacentHTML('beforeend', loginHtml);
    this.loginForm = document.getElementById('login-form');
  }
  
  buildRegisterInterface() {
    const registerHtml = `
      <div class="login-container register-container" id="register-form">
        <div class="auth-header">
          <div class="auth-logo">
            <span>ERT</span>
          </div>
          <h2>Criar Nova Conta</h2>
        </div>
        <div class="input-group">
          <label for="register-name">Nome Completo</label>
          <input type="text" id="register-name" class="input-field" placeholder="Seu nome completo">
          <div class="error-message" id="register-name-error"></div>
        </div>
        <div class="input-group">
          <label for="register-email">Email</label>
          <input type="email" id="register-email" class="input-field" placeholder="seu@email.com">
          <div class="error-message" id="register-email-error"></div>
        </div>
        <div class="input-group">
          <label for="register-password">Senha</label>
          <input type="password" id="register-password" class="input-field" placeholder="Crie uma senha forte">
          <div class="error-message" id="register-password-error"></div>
        </div>
        <button class="auth-button" id="register-button">Criar Conta</button>
        <div class="auth-links">
          <a href="#" id="back-to-login">Voltar para o login</a>
        </div>
        <div class="error-message" id="register-general-error"></div>
      </div>
    `;
    
    this.authContainer.insertAdjacentHTML('beforeend', registerHtml);
    this.registerForm = document.getElementById('register-form');
  }
  
  buildForgotPasswordInterface() {
    const forgotPasswordHtml = `
      <div class="login-container forgot-password-container" id="forgot-password-form">
        <div class="auth-header">
          <div class="auth-logo">
            <span>ERT</span>
          </div>
          <h2>Recuperar Senha</h2>
        </div>
        <div class="input-group">
          <label for="reset-email">Email</label>
          <input type="email" id="reset-email" class="input-field" placeholder="seu@email.com">
          <div class="error-message" id="reset-email-error"></div>
        </div>
        <button class="auth-button" id="reset-button">Enviar Link de Recuperação</button>
        <div class="auth-links">
          <a href="#" id="back-to-login-from-reset">Voltar para o login</a>
        </div>
        <div class="error-message" id="reset-general-error"></div>
      </div>
    `;
    
    this.authContainer.insertAdjacentHTML('beforeend', forgotPasswordHtml);
    this.forgotPasswordForm = document.getElementById('forgot-password-form');
  }
  
  addEventListeners() {
    // Verificar se os elementos existem antes de tentar adicionar os listeners
    const loginButton = document.getElementById('login-button');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const registerLink = document.getElementById('register-link');
    
    // Adicionar listeners apenas se os elementos existirem
    if (loginButton) {
      loginButton.addEventListener('click', () => this.handleLogin());
    }
    
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView('forgot-password');
      });
    }
    
    if (registerLink) {
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView('register');
      });
    }
    
    // Listeners para o formulário de registro
    const registerButton = document.getElementById('register-button');
    const backToLogin = document.getElementById('back-to-login');
    
    if (registerButton) {
      registerButton.addEventListener('click', () => this.handleRegister());
    }
    
    if (backToLogin) {
      backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView('login');
      });
    }
    
    // Listeners para o formulário de recuperação de senha
    const resetButton = document.getElementById('reset-button');
    const backToLoginFromReset = document.getElementById('back-to-login-from-reset');
    
    if (resetButton) {
      resetButton.addEventListener('click', () => this.handlePasswordReset());
    }
    
    if (backToLoginFromReset) {
      backToLoginFromReset.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchView('login');
      });
    }
    
    // Listener para eventos de autenticação (sempre deve ser executado)
    if (window.authManager) {
      window.authManager.onAuthStateChanged((isAuthenticated) => {
        if (isAuthenticated) {
          this.hideAuthContainer();
        } else {
          this.showAuthContainer();
        }
      });
    }
    
    // Listeners para tecla Enter nos campos de input
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    
    if (loginEmail) {
      loginEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && loginPassword) loginPassword.focus();
      });
    }
    
    if (loginPassword) {
      loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });
    }
  }
  
  checkAuthStateImmediate() {
    // Verificar se há uma sessão de usuário armazenada
    const userProfile = sessionStorage.getItem('userProfile');
    
    if (userProfile) {
      console.log('Perfil de usuário encontrado na sessão, aplicando imediatamente...');
      try {
        // Tentar usar os dados armazenados para mostrar a UI principal
        this.hideAuthContainer();
        return true;
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
      }
    }
    
    return false;
  }
  
  checkAuthState() {
    console.log('Verificando estado de autenticação');
    
    // Primeiro tentar com dados da sessão (mais rápido)
    if (this.checkAuthStateImmediate()) {
      return;
    }
    
    // Se não tiver dados na sessão, verificar estado de autenticação
    if (window.authManager && window.authManager.isAuthenticated()) {
      this.hideAuthContainer();
    } else {
      this.showAuthContainer();
    }
  }
  
  switchView(viewName) {
    console.log('Mudando para a view:', viewName);
    
    // Verificar se os elementos existem antes de manipulá-los
    if (!this.loginForm || !this.registerForm || !this.forgotPasswordForm) {
      console.error('Elementos de formulário não encontrados!', {
        loginForm: !!this.loginForm,
        registerForm: !!this.registerForm,
        forgotPasswordForm: !!this.forgotPasswordForm
      });
      
      // Tentar recuperar os elementos
      this.loginForm = document.getElementById('login-form');
      this.registerForm = document.getElementById('register-form');
      this.forgotPasswordForm = document.getElementById('forgot-password-form');
      
      // Verificar novamente
      if (!this.loginForm || !this.registerForm || !this.forgotPasswordForm) {
        console.error('Não foi possível recuperar os elementos de formulário.');
        return; // Evitar erro
      }
    }
  
    // Ocultar todas as views
    this.loginForm.style.display = 'none';
    this.registerForm.style.display = 'none';
    this.forgotPasswordForm.style.display = 'none';
    
    // Mostrar a view solicitada
    switch (viewName) {
      case 'login':
        this.loginForm.style.display = 'block';
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.focus();
        break;
      case 'register':
        this.registerForm.style.display = 'block';
        const registerName = document.getElementById('register-name');
        if (registerName) registerName.focus();
        break;
      case 'forgot-password':
        this.forgotPasswordForm.style.display = 'block';
        const resetEmail = document.getElementById('reset-email');
        if (resetEmail) resetEmail.focus();
        break;
    }
    
    this.currentView = viewName;
  }
  
  showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('visible');
    
    // Remover a mensagem após 5 segundos
    setTimeout(() => {
      errorElement.classList.remove('visible');
    }, 5000);
  }
  
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  validatePassword(password) {
    return password.length >= 6;
  }
  
  validateName(name) {
    return name.length >= 3;
  }
  
  async handleLogin() {
    // Obter valores
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validar campos
    let isValid = true;
    
    if (!this.validateEmail(email)) {
      this.showError('login-email-error', 'Email inválido');
      isValid = false;
    }
    
    if (!password) {
      this.showError('login-password-error', 'Senha não pode estar vazia');
      isValid = false;
    }
    
    if (!isValid) return;
    
    // Desabilitar botão e mostrar loading
    loginButton.disabled = true;
    loginButton.classList.add('auth-loading');
    loginButton.textContent = 'Entrando...';
    
    // Limpar mensagens de erro anteriores
    document.getElementById('login-general-error').textContent = '';
    document.getElementById('login-general-error').classList.remove('visible');
    
    // Adicionar timeout de segurança para não deixar o botão travado
    const safetyTimeout = setTimeout(() => {
      loginButton.disabled = false;
      loginButton.classList.remove('auth-loading');
      loginButton.textContent = 'Entrar';
      this.showError('login-general-error', 'Tempo limite excedido. Tente novamente.');
      
      // Verificar se usuário está autenticado mesmo assim (pode ter funcionado mas o callback falhou)
      if (window.authManager && window.authManager.isAuthenticated()) {
        console.log('Usuário parece estar autenticado apesar do timeout. Tentando mostrar interface principal...');
        this.hideAuthContainer();
      }
    }, 10000); // Reduzido para 10 segundos
    
    try {
      console.log('Enviando credenciais para autenticação...');
      // Executar login
      const result = await window.authManager.signIn(email, password);
      
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      
      if (result.success) {
        // Login bem-sucedido
        console.log('Login realizado com sucesso!');
        
        // Mostrar interface principal imediatamente em vez de esperar pelo evento
        this.hideAuthContainer();
      } else {
        // Erro no login
        let errorMessage = 'Erro ao fazer login. Verifique seu email e senha.';
        
        if (result.error && result.error.message) {
          if (result.error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos.';
          } else if (result.error.message.includes('Email not confirmed')) {
            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
          } else {
            errorMessage = `Erro: ${result.error.message}`;
          }
        }
        
        this.showError('login-general-error', errorMessage);
      }
    } catch (error) {
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      
      console.error('Exceção no login:', error);
      this.showError('login-general-error', `Erro ao conectar ao servidor: ${error.message || 'Erro desconhecido'}`);
    } finally {
      // Restaurar botão
      loginButton.disabled = false;
      loginButton.classList.remove('auth-loading');
      loginButton.textContent = 'Entrar';
    }
  }
  
  async handleRegister() {
    console.log('Iniciando registro...');
    
    // Obter valores
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const registerButton = document.getElementById('register-button');
    const generalErrorElement = document.getElementById('register-general-error');
    
    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Debug dos valores
    console.log('Valores do formulário:', { fullName, email, password: '***' });
    
    // Validar campos
    let isValid = true;
    
    if (!this.validateName(fullName)) {
      this.showError('register-name-error', 'Nome deve ter pelo menos 3 caracteres');
      isValid = false;
    }
    
    if (!this.validateEmail(email)) {
      this.showError('register-email-error', 'Email inválido');
      isValid = false;
    }
    
    if (!this.validatePassword(password)) {
      this.showError('register-password-error', 'Senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }
    
    if (!isValid) return;
    
    // Desabilitar botão e mostrar loading
    registerButton.disabled = true;
    registerButton.classList.add('auth-loading');
    registerButton.textContent = 'Criando conta...';
    
    let signupResult = null; // Declarar fora para usar em todo o método
    
    try {
      // Verificar se o authManager está realmente inicializado
      if (!window.authManager || !window.authManager.supabase) {
        console.error('AuthManager não está inicializado corretamente!');
        this.showError('register-general-error', 'Erro de conexão: biblioteca de autenticação não inicializada.');
        return;
      }
      
      console.log('Enviando dados para registro...');
      // Executar registro
      signupResult = await window.authManager.signUp(email, password, fullName);
      console.log('Resultado do registro:', signupResult);
      
      if (signupResult.success) {
        // Registro bem-sucedido
        this.switchView('login');
        this.showError('login-general-error', 'Conta criada com sucesso! Verifique seu email para confirmar o cadastro.');
      } else {
        // Erro no registro
        let errorMessage = 'Erro ao criar conta.';
        
        if (signupResult.error && signupResult.error.message) {
          errorMessage = signupResult.error.message;
          
          // Erros específicos
          if (signupResult.error.message.includes('already registered')) {
            errorMessage = 'Este email já está registrado.';
          } else if (signupResult.error.name === 'RateLimitError' && signupResult.error.remainingSeconds) {
            const seconds = signupResult.error.remainingSeconds;
            errorMessage = `Muitas tentativas. Aguarde ${seconds} segundos antes de tentar novamente.`;
            
            // Iniciar uma contagem regressiva
            if (generalErrorElement) {
              let remainingTime = seconds;
              const countdownInterval = setInterval(() => {
                remainingTime--;
                if (remainingTime <= 0) {
                  clearInterval(countdownInterval);
                  generalErrorElement.textContent = 'Você já pode tentar novamente.';
                  registerButton.disabled = false;
                  registerButton.classList.remove('auth-loading');
                  registerButton.textContent = 'Criar Conta';
                  
                  // Remover a mensagem após 3 segundos
                  setTimeout(() => {
                    generalErrorElement.classList.remove('visible');
                  }, 3000);
                } else {
                  generalErrorElement.textContent = `Muitas tentativas. Aguarde ${remainingTime} segundos antes de tentar novamente.`;
                }
              }, 1000);
            }
          }
        }
        
        this.showError('register-general-error', errorMessage);
      }
    } catch (error) {
      console.error('Erro detalhado no registro:', error);
      this.showError('register-general-error', `Erro ao conectar ao servidor: ${error.message || 'Erro desconhecido'}`);
    } finally {
      // Restaurar botão apenas se não estivermos em contagem regressiva
      if (!signupResult || !signupResult.error || signupResult.error.name !== 'RateLimitError') {
        registerButton.disabled = false;
        registerButton.classList.remove('auth-loading');
        registerButton.textContent = 'Criar Conta';
      }
    }
  }
  
  async handlePasswordReset() {
    // Obter valores
    const emailInput = document.getElementById('reset-email');
    const resetButton = document.getElementById('reset-button');
    
    const email = emailInput.value.trim();
    
    // Validar email
    if (!this.validateEmail(email)) {
      this.showError('reset-email-error', 'Email inválido');
      return;
    }
    
    // Desabilitar botão e mostrar loading
    resetButton.disabled = true;
    resetButton.classList.add('auth-loading');
    resetButton.textContent = 'Enviando...';
    
    try {
      // Executar recuperação de senha
      const result = await window.authManager.resetPassword(email);
      
      if (result.success) {
        // Email enviado com sucesso
        this.switchView('login');
        this.showError('login-general-error', 'Link de recuperação enviado! Verifique seu email.');
      } else {
        // Erro
        this.showError('reset-general-error', 'Erro ao solicitar recuperação de senha.');
      }
    } catch (error) {
      this.showError('reset-general-error', 'Erro ao conectar ao servidor.');
      console.error('Erro na recuperação de senha:', error);
    } finally {
      // Restaurar botão
      resetButton.disabled = false;
      resetButton.classList.remove('auth-loading');
      resetButton.textContent = 'Enviar Link de Recuperação';
    }
  }
  
  hideAuthContainer() {
    console.log('Escondendo container de autenticação');
    
    try {
      if (this.authContainer) {
        // Esconder o container de autenticação
        this.authContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Garantir que o conteúdo principal esteja visível e interativo
        if (this.mainContent) {
          this.mainContent.style.display = 'block';
          this.mainContent.style.opacity = '1';
          
          // Restaurar interatividade dos elementos
          Array.from(this.mainContent.children).forEach(element => {
            element.style.pointerEvents = 'auto';
            element.style.opacity = '1';
            
            // Garantir que o retângulo esquerdo esteja visível
            if (element.id === 'left-rectangle') {
              element.style.display = 'block';
            }
          });
        }
        
        // Mostrar informações do usuário logado
        this.showUserInfo();
        
        // Mostrar botão de logout
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
          logoutButton.style.display = 'block';
        }
        
        console.log('Interface principal revelada com sucesso');
      } else {
        console.error('authContainer não encontrado! Chamando método de emergência');
        // Se chegou aqui, algo está muito errado. Tente forçar a exibição da interface principal
        if (window.forceShowMainInterface) {
          window.forceShowMainInterface();
        }
      }
    } catch (error) {
      console.error('Erro ao esconder o container de autenticação:', error);
      
      // Tentar recuperação de emergência
      if (window.forceShowMainInterface) {
        window.forceShowMainInterface();
      }
    }
  }
  
  showAuthContainer() {
    console.log('Mostrando container de autenticação');
    if (this.authContainer) {
      this.authContainer.style.display = 'flex';
      
      // Pequeno delay para garantir animação suave
      requestAnimationFrame(() => {
        this.authContainer.classList.add('visible');
      });
      
      document.body.style.overflow = 'hidden';
      
      // Bloquear interação com o restante da aplicação
      Array.from(this.mainContent.children).forEach(element => {
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.5';
      });
      
      // Verificar se os elementos existem antes de trocar a visualização
      setTimeout(() => {
        if (!this.loginForm) this.loginForm = document.getElementById('login-form');
        if (!this.registerForm) this.registerForm = document.getElementById('register-form');
        if (!this.forgotPasswordForm) this.forgotPasswordForm = document.getElementById('forgot-password-form');
        
        // Garantir que a view correta esteja visível
        this.switchView(this.currentView);
      }, 50);
    }
  }
  
  showUserInfo() {
    let userProfile;
    
    // Tentar obter perfil do gerenciador de autenticação
    if (window.authManager && window.authManager.userProfile) {
      userProfile = window.authManager.userProfile;
    } else {
      // Tentar obter perfil do sessionStorage
      try {
        const storedProfile = sessionStorage.getItem('userProfile');
        if (storedProfile) {
          userProfile = JSON.parse(storedProfile);
        } else {
          // Perfil básico como último recurso
          userProfile = {
            full_name: 'Usuário',
            privilege_level: 'user'
          };
        }
      } catch (error) {
        console.error('Erro ao obter perfil do usuário:', error);
        // Usar perfil básico em caso de erro
        userProfile = {
          full_name: 'Usuário',
          privilege_level: 'user'
        };
      }
    }
    
    // Obter referência ao container existente
    const userInfoContainer = document.getElementById('user-info-container');
    if (!userInfoContainer) {
      console.error('Container de informações do usuário não encontrado no DOM');
      return;
    }
    
    // Atualizar apenas o conteúdo
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    
    if (userName) userName.textContent = userProfile.full_name || 'Usuário';
    if (userRole) userRole.textContent = this.formatPrivilegeLevel(userProfile.privilege_level || 'user');
    
    // Mostrar o container
    userInfoContainer.style.display = 'block';
    
    // Aplicar estilos responsivos (manter esta parte se necessário)
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
    
    if (isMobile || isTablet) {
      // Aplicar apenas os ajustes responsivos, deixando o resto para o CSS
      console.log(`[UserInfo] Aplicando estilo para ${isMobile ? 'celular' : 'tablet'}`);
    } else {
      console.log('[UserInfo] Aplicando estilo para desktop');
    }
  }
  
  formatPrivilegeLevel(level) {
    const privilegeNames = {
      'master admin': 'Admin Master',
      'admin': 'Admin',
      'user': 'Usuário',
      'common user': 'Usuário Comum'
    };
    
    return privilegeNames[level] || level;
  }
}

// Inicializar gerenciador de login quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado, verificando dependências...');
  // Esperar Supabase e AuthManager serem carregados
  const checkDependencies = setInterval(() => {
    if (window.authManager && window.supabase) {
      console.log('Dependências carregadas, inicializando LoginManager');
      clearInterval(checkDependencies);
      window.loginManager = new LoginManager();
    }
  }, 100);
});