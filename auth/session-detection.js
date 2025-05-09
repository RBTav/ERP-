/**
 * Verificação imediata de sessão para evitar flash da tela de login
 */
(function() {
  // Flag global para indicar estado de sessão
  window.hasExistingSession = false;
  
  // 1. Verificar sessionStorage primeiro (mais rápido)
  if (sessionStorage.getItem('userProfile')) {
    document.write('<style id="prevent-auth-flash">#auth-container{display:none !important;}</style>');
    window.hasExistingSession = true;
    console.log('[FastAuth] Sessão detectada em sessionStorage');
  }
  // 2. Verificar também localStorage para tokens do Supabase
  else {
    try {
      const hasToken = Object.keys(localStorage).some(key => 
        key.includes('supabase') || key.includes('sb-')
      );
      
      if (hasToken) {
        document.write('<style id="prevent-auth-flash">#auth-container{display:none !important;}</style>');
        window.hasExistingSession = true;
        console.log('[FastAuth] Token Supabase detectado em localStorage');
      }
    } catch (e) {
      console.error('[FastAuth] Erro ao verificar localStorage:', e);
    }
  }
  
  // 3. Adicionar flag de sessão no localStorage para persistência entre recarregamentos
  if (window.hasExistingSession) {
    try {
      localStorage.setItem('auth_session_active', 'true');
    } catch(e) {}
  }
})();