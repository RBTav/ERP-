/**
 * Otimizador de eventos touch para melhorar o INP (Interaction to Next Paint)
 */
class TouchOptimizer {
  constructor() {
    this.init();
  }
  
  init() {
    // Aplicar otimizações assim que o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', () => {
      this.optimizeBodyTouchEvents();
      this.optimizeRectangleTouchEvents();
      this.addPreventDefaultHandlers();
    });
  }
  
  optimizeBodyTouchEvents() {
    // Tornar todos os eventos touch no body passivos
    const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
    
    passiveEvents.forEach(eventName => {
      document.body.addEventListener(eventName, (e) => {
        // Verificar se o clique foi no fundo e não em um elemento interativo
        if (e.target === document.body) {
          e.stopPropagation();
        }
      }, { passive: true });
    });
    
    // Adicionar CSS para melhor performance
    document.body.style.webkitTapHighlightColor = 'transparent';
    document.body.style.contain = 'paint layout';
    document.body.style.touchAction = 'manipulation';
  }
  
  optimizeRectangleTouchEvents() {
    const leftRect = document.getElementById('left-rectangle');
    if (!leftRect) return;
    
    // Tornar eventos touch no retângulo esquerdo passivos
    leftRect.addEventListener('touchstart', (e) => {
      // Se o toque não for em um elemento interativo dentro do retângulo, pare
      if (!this.isInteractiveElement(e.target)) {
        e.stopPropagation();
      }
    }, { passive: true });
    
    // Adicionar CSS para melhor performance
    leftRect.style.webkitTapHighlightColor = 'transparent';
    leftRect.style.contain = 'paint layout';
    leftRect.style.willChange = 'transform';
  }
  
  addPreventDefaultHandlers() {
    // Impedir comportamentos padrão indesejados que podem atrasar o INP
    document.addEventListener('contextmenu', (e) => {
      if (!this.isEditableElement(e.target)) {
        e.preventDefault();
      }
    });
    
    // Impedir toques longos que abrem menus de contexto no celular
    document.addEventListener('touchstart', (e) => {
      if (!this.isEditableElement(e.target)) {
        // Não chamar preventDefault pois queremos manter o listener como passive
        // Em vez disso, retornar rapidamente
        return false;
      }
    }, { passive: true });
    
    // Para links específicos, desativar comportamento padrão e usar alternativas mais rápidas
    document.querySelectorAll('a[href="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
      });
    });
  }
  
  isInteractiveElement(element) {
    const interactiveElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
    
    // Verificar se o elemento ou qualquer pai próximo é interativo
    let currentElement = element;
    for (let i = 0; i < 3; i++) { // Checar até 3 níveis acima
      if (!currentElement) break;
      
      if (interactiveElements.includes(currentElement.tagName) || 
          currentElement.classList.contains('control-button') ||
          currentElement.id === 'user-image') {
        return true;
      }
      
      currentElement = currentElement.parentElement;
    }
    
    return false;
  }
  
  isEditableElement(element) {
    const editableTypes = ['text', 'textarea', 'password', 'email', 'number', 'search', 'tel', 'url'];
    return (element.tagName === 'INPUT' && editableTypes.includes(element.type)) || 
           element.tagName === 'TEXTAREA' || 
           element.isContentEditable;
  }
}

// Instanciar o otimizador
new TouchOptimizer();