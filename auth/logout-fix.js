/**
 * Script para garantir que o logout seja aplicado corretamente 
 * mesmo após recarregar a página
 */
(function() {
  // Verificar imediatamente se temos parâmetro de logout na URL (prioridade máxima)
  if (window.location.search.includes('logout=')) {
    // Executar antes de qualquer outro script
    console.log('[LOGOUT-FIX] Parâmetro de logout detectado - limpeza rápida');
    
    // Limpar localStorage e sessionStorage (operações mais rápidas primeiro)
    try {
      // Remover apenas tokens relevantes em vez de limpar tudo
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-') || key === 'auth_session_active')) {
          localStorage.removeItem(key);
        }
      }
      
      // Limpar apenas dados de sessão relevantes
      sessionStorage.removeItem('userProfile');
      sessionStorage.removeItem('userBasicInfo');
      
      // Limpar URL rapidamente
      if (history.replaceState) {
        history.replaceState(null, document.title, window.location.pathname);
      }
      
      console.log('[LOGOUT-FIX] Limpeza rápida concluída!');
    } catch (e) {
      console.error('[LOGOUT-FIX] Erro na limpeza rápida:', e);
    }
  }
  
  // Executar verificações imediatamente ao carregar
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando estado de logout...');
    
    // Verificar se estamos em uma operação de logout
    if (window.location.search.includes('logout=')) {
      console.log('Parâmetro de logout detectado na URL!');
      
      // 1. Limpar TODOS os dados armazenados
      try {
        // Limpar localStorage
        localStorage.clear();
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Limpar cookies (apenas os que podemos acessar via JS)
        document.cookie.split(';').forEach(function(cookie) {
          const [name] = cookie.trim().split('=');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
      } catch (e) {
        console.error('Erro ao limpar dados:', e);
      }
      
      // 2. Atualizar UI para mostrar estado deslogado
      const logoutButton = document.getElementById('logout-button');
      if (logoutButton) logoutButton.style.display = 'none';
      
      const userInfoContainer = document.getElementById('user-info-container');
      if (userInfoContainer) userInfoContainer.style.display = 'none';
      
      // 3. Forçar exibição do container de autenticação
      console.log('Forçando exibição da tela de login...');
      
      // Pequeno atraso para garantir que LoginManager já esteja inicializado
      setTimeout(() => {
        if (window.loginManager) {
          window.loginManager.showAuthContainer();
        }
        
        // Limpar a URL para evitar loops em futuros recarregamentos
        if (history.replaceState) {
          history.replaceState(null, document.title, window.location.pathname);
        }
      }, 200);
    }
  });
})();