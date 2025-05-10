class ProfileImage {
  constructor() {
    this.imageContainer = document.getElementById('user-image');
    this.fileInput = document.getElementById('profile-upload');
    this.currentImage = null;
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.imageData = null;
    
    // Nova referência ao retângulo pai
    this.leftRectangle = document.getElementById('left-rectangle');
    
    // Resto do construtor permanece igual
    this.initialPinchDistance = 0;
    this.initialScale = 1;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Upload de imagem
    this.imageContainer.addEventListener('click', (e) => {
      // Se temos uma imagem e não é um clique em um botão de controle
      if (this.currentImage && !e.target.classList.contains('control-button')) {
        // Se estivermos em modo de edição (com controles visíveis)
        if (this.imageContainer.querySelector('.image-controls')) {
          // Já em modo de edição, só previne o upload
          e.stopPropagation();
          return;
        }
        
        // Se a imagem já foi salva, não permitir edição
        if (this.imageData) {
          // Impedir qualquer ação ao clicar em uma imagem salva
          e.stopPropagation();
          return;
        }
        
        // Se chegou aqui, é uma imagem recém-carregada que ainda não foi salva
        // Adicionar controles para edição
        this.createControls();
        
        // Mudar cursor para modo de edição
        this.currentImage.style.cursor = 'move';
        e.stopPropagation();
        return;
      }
      // Sem imagem ou imagem não salva, iniciamos o upload
      this.triggerFileUpload();
    });
    
    this.fileInput.addEventListener('change', (event) => this.handleFileSelect(event));
    
    // Eventos para desktop
    document.addEventListener('mouseup', () => this.stopDragging());
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) this.dragImage(e.clientX, e.clientY);
    });
    
    // Eventos para dispositivos touch - tornar passive quando possível
    document.addEventListener('touchend', (e) => {
      this.stopDragging();
      if (e.touches.length < 2) this.initialPinchDistance = 0;
    }, { passive: true });
    
    document.addEventListener('touchcancel', () => {
      this.stopDragging();
      this.initialPinchDistance = 0;
    }, { passive: true });
    
    // Otimização para touchmove com debounce simples
    let lastMoveTime = 0;
    document.addEventListener('touchmove', (e) => {
      // Limitar taxa de processamento em dispositivos menos potentes
      const now = Date.now();
      if (now - lastMoveTime < 16 && window.devicePixelRatio > 2) { // Skip frames em dispositivos de alta resolução
        return;
      }
      lastMoveTime = now;
      
      if (this.currentImage) {
        // Detectar gesto de pinça (2 dedos)
        if (e.touches.length >= 2) {
          e.preventDefault();
          this.handlePinchZoom(e);
        } 
        // Arrastar com um dedo
        else if (this.isDragging && e.touches[0]) {
          e.preventDefault();
          this.dragImage(e.touches[0].clientX, e.touches[0].clientY);
        }
      }
    }, { passive: false });
    
    // Adicione este novo ouvinte de evento no final do método
    window.addEventListener('resize', () => {
      if (document.getElementById('image-controls')) {
        console.log('*** JANELA REDIMENSIONADA ***');
        this.logElementPositions();
      }
    });
  }
  
  triggerFileUpload() {
    this.fileInput.click();
  }
  
  handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!this.validateFile(file)) {
      return;
    }
    
    this.loadImagePreview(file);
  }
  
  validateFile(file) {
    if (!file) {
      return false;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione uma imagem válida (JPEG, PNG, GIF, WEBP)');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter menos de 5MB');
      return false;
    }
    
    return true;
  }
  
  loadImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      this.createImageElement(e.target.result);
    };
    
    reader.readAsDataURL(file);
  }
  
  createImageElement(imageSrc) {
    // Remove imagem e controles anteriores
    this.removeExistingElements();
    
    // Cria novo elemento de imagem
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';
    img.style.transform = 'scale(1) translate(0px, 0px)';
    img.style.transformOrigin = 'center';
    img.style.cursor = 'move';
    
    // Adiciona a imagem e marca o container
    this.imageContainer.appendChild(img);
    this.currentImage = img;
    this.imageContainer.classList.add('has-image');
    
    // Resetar valores
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    
    // Adicionar controles
    this.createControls();
    
    // Adicionar eventos para arrastar
    this.setupDragEvents(img);
  }
  
  handlePinchZoom(e) {
    // Calcular a distância entre os dois pontos de toque
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    // Na primeira detecção de pinça, armazenar distância inicial
    if (this.initialPinchDistance === 0) {
      this.initialPinchDistance = currentDistance;
      this.initialScale = this.scale;
      return;
    }
    
    // Calcular nova escala com base na mudança de distância
    let newScale = (currentDistance / this.initialPinchDistance) * this.initialScale;
    
    // Limitar zoom
    newScale = Math.max(1, Math.min(3, newScale));
    
    // Calcular o centro da pinça como ponto de referência
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    // Ajustar o zoom
    this.scale = newScale;
    
    // Ajustar limites de posição após mudança de escala
    const maxOffset = (this.scale - 1) * 50;
    this.posX = Math.max(Math.min(this.posX, maxOffset), -maxOffset);
    this.posY = Math.max(Math.min(this.posY, maxOffset), -maxOffset);
    
    this.updateImageTransform();
  }
  
  setupDragEvents(imgElement) {
    // Iniciar arrasto
    imgElement.addEventListener('mousedown', (e) => {
      this.startDragging(e.clientX, e.clientY);
      e.preventDefault();
    });
    
    // Melhorar eventos de touch
    imgElement.addEventListener('touchstart', (e) => {
      // Se for um toque único (não pinça)
      if (e.touches.length === 1) {
        this.startDragging(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  startDragging(clientX, clientY) {
    this.isDragging = true;
    this.dragStartX = clientX - this.posX;
    this.dragStartY = clientY - this.posY;
  }
  
  dragImage(clientX, clientY) {
    if (!this.isDragging || !this.currentImage) return;
    
    // Calcular nova posição
    this.posX = clientX - this.dragStartX;
    this.posY = clientY - this.dragStartY;
    
    // Limitar o arrasto para não mostrar áreas vazias
    const maxOffset = (this.scale - 1) * 50; // 50% é metade do tamanho da imagem
    this.posX = Math.max(Math.min(this.posX, maxOffset), -maxOffset);
    this.posY = Math.max(Math.min(this.posY, maxOffset), -maxOffset);
    
    this.updateImageTransform();
  }
  
  stopDragging() {
    this.isDragging = false;
  }
  
  // Modificar este método para anexar os controles ao retângulo lateral
  createControls() {
    // Remover controles existentes, se houver
    this.removeControls();
    
    // Criar contêiner fora do DOM para melhor performance
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'image-controls';
    controlsContainer.id = 'image-controls';
    
    // Criar fragment para minimizar reflows
    const fragment = document.createDocumentFragment();
    
    // Criar botões e adicioná-los ao fragment
    const buttons = [
      { text: '+', action: () => this.zoomImage(0.1) },
      { text: '-', action: () => this.zoomImage(-0.1) },
      { text: 'R', action: () => this.resetImage() },
      { text: '✓', action: () => this.saveImage(), class: 'save-button' }
    ];
    
    buttons.forEach(btn => {
      const button = this.createButton(btn.text, btn.action);
      if (btn.class) button.classList.add(btn.class);
      fragment.appendChild(button);
    });
    
    // Anexar fragment ao contêiner
    controlsContainer.appendChild(fragment);
    
    // Adicionar contêiner ao DOM em um único reflow
    requestAnimationFrame(() => {
      this.leftRectangle.appendChild(controlsContainer);
    });
  }
  
  // Substituir o método createButton existente
  createButton(text, clickHandler) {
    const button = document.createElement('button');
    button.className = 'control-button';
    button.textContent = text;
    
    // Usar touchstart com passive true para resposta imediata em dispositivos móveis
    button.addEventListener('touchstart', (e) => {
      // Fornecer feedback visual imediato
      button.style.opacity = '0.7';
      
      // Impedir propagação para evitar conflitos
      e.stopPropagation();
    }, { passive: true });
    
    // Touchend para completar a ação
    button.addEventListener('touchend', (e) => {
      // Restaurar aparência normal
      button.style.opacity = '1';
      
      // Executar a ação após um pequeno atraso para permitir a animação
      setTimeout(() => {
        clickHandler();
      }, 0);
      
      // Impedir cliques fantasmas e outros eventos
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Manter evento de clique para desktop
    button.addEventListener('click', (e) => {
      // Dispositivos não touch usarão este evento
      if (!('ontouchstart' in window)) {
        clickHandler();
        e.stopPropagation();
      }
    });
    
    return button;
  }
  
  zoomImage(deltaScale) {
    this.scale = Math.max(1, Math.min(3, this.scale + deltaScale));
    
    // Ajustar limites de posição após mudança de escala
    const maxOffset = (this.scale - 1) * 50;
    this.posX = Math.max(Math.min(this.posX, maxOffset), -maxOffset);
    this.posY = Math.max(Math.min(this.posY, maxOffset), -maxOffset);
    
    this.updateImageTransform();
  }
  
  resetImage() {
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    this.updateImageTransform();
  }
  
  updateImageTransform() {
    if (!this.currentImage) return;
    this.currentImage.style.transform = `scale(${this.scale}) translate(${this.posX / this.scale}px, ${this.posY / this.scale}px)`;
  }
  
  removeExistingElements() {
    // Remove imagem anterior se existir
    const oldImage = this.imageContainer.querySelector('img');
    if (oldImage) {
      this.imageContainer.removeChild(oldImage);
    }
    
    // Remove controles anteriores se existirem
    const oldControls = this.imageContainer.querySelector('.image-controls');
    if (oldControls) {
      this.imageContainer.removeChild(oldControls);
    }
  }
  
  // Modificar este método para remover do retângulo lateral
  removeControls() {
    const controls = document.getElementById('image-controls');
    if (controls) {
      controls.parentNode.removeChild(controls);
    }
  }
  
  // Modificar o início do método saveImage
  saveImage() {
    if (!this.currentImage) return;
    
    // Mostrar indicador de processamento
    const processing = document.createElement('div');
    processing.className = 'save-confirmation';
    processing.textContent = 'Processando...';
    processing.id = 'processing-indicator';
    this.imageContainer.appendChild(processing);
    
    // Timeout de segurança para remover o indicador em caso de falha
    const safetyTimeout = setTimeout(() => {
      this.removeProcessingIndicator();
    }, 10000); // 10 segundos de timeout
    
    // Adiar o trabalho pesado para permitir atualização da UI
    setTimeout(() => {
      try {
        const originalSource = this.currentImage.src;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Determinar tamanho do círculo
        const containerWidth = this.imageContainer.offsetWidth;
        const containerHeight = this.imageContainer.offsetHeight;
        
        // Ajuste de qualidade baseado nas capacidades do dispositivo
        let qualityFactor;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Reduzir qualidade em dispositivos móveis
          qualityFactor = Math.min(2, window.devicePixelRatio || 1);
          
          // Atualizar indicador de processamento
          this.updateProcessingStatus("Otimizando para dispositivo...");
        } else {
          // Usar alta qualidade em desktops
          qualityFactor = window.devicePixelRatio >= 2 ? 3 : 2;
        }
        
        // Configurar canvas com resolução mais adequada ao dispositivo
        canvas.width = containerWidth * qualityFactor;
        canvas.height = containerHeight * qualityFactor;
        
        // Configurações de renderização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Atualizar indicador
        this.updateProcessingStatus("Recortando imagem...");
        
        // Recortar em forma de círculo
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, canvas.width/2, 0, Math.PI*2);
        ctx.closePath();
        ctx.clip();
        
        // Fundo para áreas transparentes
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dividir o processamento em etapas para evitar bloqueio da UI
        const completeImageProcessing = () => {
          try {
            // Atualizar indicador
            this.updateProcessingStatus("Aplicando transformações...");
            
            // Salvar estado do canvas
            ctx.save();
            
            // Aplicar transformações
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(this.scale * qualityFactor, this.scale * qualityFactor);
            ctx.translate(
              -containerWidth/2 + this.posX/this.scale, 
              -containerHeight/2 + this.posY/this.scale
            );
            
            const imgWidth = this.currentImage.naturalWidth || this.currentImage.width;
            const imgHeight = this.currentImage.naturalHeight || this.currentImage.height;
            
            const containerRatio = containerWidth / containerHeight;
            const imgRatio = imgWidth / imgHeight;
            
            let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
            
            // Calcular dimensões mantendo proporção
            if (imgRatio > containerRatio) {
              drawHeight = containerHeight;
              drawWidth = drawHeight * imgRatio;
              offsetX = (containerWidth - drawWidth) / 2;
            } else {
              drawWidth = containerWidth;
              drawHeight = drawWidth / imgRatio;
              offsetY = (containerHeight - drawHeight) / 2;
            }
            
            // Atualizar indicador
            this.updateProcessingStatus("Renderizando...");
            
            // Desenhar a imagem
            ctx.drawImage(this.currentImage, offsetX, offsetY, drawWidth, drawHeight);
            ctx.restore();
            
            // Formato e qualidade adequados para dispositivos móveis
            const imageFormat = isMobile ? 'image/jpeg' : 'image/png';
            const imageQuality = isMobile ? 0.85 : 1.0;
            
            // Obter dados da imagem processada
            this.imageData = canvas.toDataURL(imageFormat, imageQuality);
            
            // Finalizar o processamento em outra etapa
            setTimeout(() => this.finalizeImageSaving(), 0);
          } catch (err) {
            console.error("Erro ao aplicar transformações:", err);
            this.handleProcessingError("Erro ao processar imagem");
          }
        };
        
        // Iniciar processamento após um breve atraso
        setTimeout(completeImageProcessing, 100);
      } catch (err) {
        console.error("Erro inicial ao processar imagem:", err);
        this.handleProcessingError("Erro ao iniciar processamento");
      }
      
      // Limpar o timeout de segurança - código continuará executando
      clearTimeout(safetyTimeout);
    }, 200); // Aumentado para 200ms para garantir atualização da UI
  }
  
  // Método para atualizar o status de processamento
  updateProcessingStatus(message) {
    const indicator = document.getElementById('processing-indicator');
    if (indicator) {
      indicator.textContent = message;
    }
  }
  
  // Método para remover indicador de processamento
  removeProcessingIndicator() {
    const indicator = document.getElementById('processing-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }
  
  // Método para lidar com erros de processamento
  handleProcessingError(message) {
    this.removeProcessingIndicator();
    
    // Mostrar mensagem de erro
    const errorMsg = document.createElement('div');
    errorMsg.className = 'save-confirmation';
    errorMsg.style.backgroundColor = 'rgba(204, 0, 0, 0.8)';
    errorMsg.textContent = message || 'Erro ao processar imagem';
    this.imageContainer.appendChild(errorMsg);
    
    // Remover após 3 segundos
    setTimeout(() => {
      if (errorMsg.parentNode) {
        errorMsg.parentNode.removeChild(errorMsg);
      }
    }, 3000);
  }
  
  // Método para finalizar o salvamento da imagem
  finalizeImageSaving() {
    try {
      // Atualizar indicador
      this.updateProcessingStatus("Finalizando...");
      
      // Substituir imagem por versão processada
      const newImage = new Image();
      
      newImage.onload = () => {
        if (this.currentImage) {
          // Preservar todos os estilos
          newImage.style.cssText = this.currentImage.style.cssText;
          newImage.style.cursor = 'pointer';
          
          // Substituir imagem
          this.imageContainer.replaceChild(newImage, this.currentImage);
          this.currentImage = newImage;
          
          // Resetar transformações
          this.scale = 1;
          this.posX = 0;
          this.posY = 0;
          
          // Remover controles e indicador de processamento
          this.removeControls();
          this.removeProcessingIndicator();
          
          // Feedback de sucesso
          this.showSaveConfirmation();
        }
      };
      
      newImage.onerror = () => {
        this.handleProcessingError("Erro ao carregar imagem");
      };
      
      newImage.src = this.imageData;
    } catch (err) {
      console.error("Erro ao finalizar imagem:", err);
      this.handleProcessingError("Erro ao finalizar");
    }
  }
  
  // Método para mostrar confirmação de salvamento
  showSaveConfirmation() {
    // Criar elemento de confirmação
    const confirmation = document.createElement('div');
    confirmation.className = 'save-confirmation';
    confirmation.textContent = 'Imagem salva!';
    
    // Aplicar estilo especial para confirmação de sucesso
    confirmation.style.backgroundColor = 'rgba(46, 204, 113, 0.8)'; // Verde
    
    // Adicionar ao contêiner da imagem
    this.imageContainer.appendChild(confirmation);
    
    // Remover automaticamente após a animação
    setTimeout(() => {
      if (confirmation.parentNode) {
        confirmation.parentNode.removeChild(confirmation);
      }
    }, 2000); // 2 segundos, tempo suficiente para a animação de fadeOut
    
    // Registrar no log de debug se disponível
    if (window.debugManager) {
      window.debugManager.log('controls', 'Imagem salva com sucesso', {
        timestamp: new Date().toISOString()
      });
    }
    
    // Registrar evento para analytics de performance
    if (window.performanceMonitor && window.performanceMonitor.isEnabled) {
      console.info('Image processing completed successfully');
    }
  }
  
  logElementPositions() {
    // Obter todas as informações relevantes
    const rect = this.leftRectangle.getBoundingClientRect();
    const imageRect = this.imageContainer.getBoundingClientRect();
    const controlsElement = document.getElementById('image-controls');
    
    console.log('=== DIAGNÓSTICO DE POSIÇÃO ===');
    console.log('Dispositivo:', window.innerWidth <= 768 ? 'MOBILE' : 'DESKTOP');
    console.log('Dimensões da janela:', window.innerWidth, 'x', window.innerHeight);
    
    // Informações do retângulo lateral
    console.log('RETÂNGULO:');
    console.log('- Posição:', rect.left, rect.top);
    console.log('- Dimensões:', rect.width, 'x', rect.height);
    
    // Informações do círculo da imagem
    console.log('CÍRCULO:');
    console.log('- Posição:', imageRect.left, imageRect.top);
    console.log('- Dimensões:', imageRect.width, 'x', imageRect.height);
    console.log('- Posição relativa ao retângulo:', 
                imageRect.left - rect.left, 
                imageRect.top - rect.top);
    
    // Informações dos controles
    if (controlsElement) {
      const controlsRect = controlsElement.getBoundingClientRect();
      console.log('CONTROLES:');
      console.log('- Posição:', controlsRect.left, controlsRect.top);
      console.log('- Dimensões:', controlsRect.width, 'x', controlsRect.height);
      console.log('- Posição relativa ao retângulo:', 
                  controlsRect.left - rect.left, 
                  controlsRect.top - rect.top);
      console.log('- Distância entre controles e círculo:', 
                  controlsRect.top - imageRect.top);
      
      // Estilos CSS aplicados
      const computedStyle = window.getComputedStyle(controlsElement);
      console.log('ESTILOS CSS APLICADOS:');
      console.log('- top:', computedStyle.top);
      console.log('- left:', computedStyle.left);
      console.log('- transform:', computedStyle.transform);
      console.log('- width:', computedStyle.width);
    } else {
      console.log('CONTROLES: Não encontrados no DOM');
    }
    
    console.log('============================');
  }
}

// Inicializa o manipulador quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new ProfileImage();
});