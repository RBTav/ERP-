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
    
    // Eventos para dispositivos touch
    document.addEventListener('touchend', (e) => {
      this.stopDragging();
      if (e.touches.length < 2) this.initialPinchDistance = 0;
    }, { passive: false });
    
    document.addEventListener('touchcancel', () => {
      this.stopDragging();
      this.initialPinchDistance = 0;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
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
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'image-controls';
    controlsContainer.id = 'image-controls';
    
    // Botão de zoom in
    const zoomInButton = this.createButton('+', () => this.zoomImage(0.1));
    controlsContainer.appendChild(zoomInButton);
    
    // Botão de zoom out
    const zoomOutButton = this.createButton('-', () => this.zoomImage(-0.1));
    controlsContainer.appendChild(zoomOutButton);
    
    // Botão de resetar
    const resetButton = this.createButton('R', () => this.resetImage());
    controlsContainer.appendChild(resetButton);
    
    // Botão de salvar
    const saveButton = this.createButton('✓', () => this.saveImage());
    saveButton.classList.add('save-button');
    controlsContainer.appendChild(saveButton);
    
    // Anexar ao retângulo lateral
    this.leftRectangle.appendChild(controlsContainer);
    
    // Log para diagnóstico
    console.log('Controles criados e anexados ao RETÂNGULO');
    
    // Aguardar renderização para obter posições corretas
    setTimeout(() => this.logElementPositions(), 100);
  }
  
  createButton(text, clickHandler) {
    const button = document.createElement('button');
    button.className = 'control-button';
    button.textContent = text;
    button.addEventListener('click', (e) => {
      clickHandler();
      e.stopPropagation();
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
  
  saveImage() {
    if (!this.currentImage) return;
    
    // Criar um canvas para processar a imagem
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Tamanho do círculo
    const containerWidth = this.imageContainer.offsetWidth;
    const containerHeight = this.imageContainer.offsetHeight;
    
    // Configurar o canvas com o tamanho do círculo
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Criar um caminho circular para corte
    ctx.beginPath();
    ctx.arc(containerWidth / 2, containerHeight / 2, containerWidth / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Salvar o estado do canvas antes das transformações
    ctx.save();
    
    // Aplicar transformações na ordem correta
    ctx.translate(containerWidth / 2, containerHeight / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-containerWidth / 2 + this.posX / this.scale, -containerHeight / 2 + this.posY / this.scale);
    
    // Obter dimensões da imagem original
    const imgWidth = this.currentImage.naturalWidth || this.currentImage.width;
    const imgHeight = this.currentImage.naturalHeight || this.currentImage.height;
    
    // Calcular proporção para ajuste correto
    const containerRatio = containerWidth / containerHeight;
    const imgRatio = imgWidth / imgHeight;
    
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    // Calcular dimensões mantendo proporção
    if (imgRatio > containerRatio) {
      // Imagem é mais larga que o contêiner
      drawHeight = containerHeight;
      drawWidth = drawHeight * imgRatio;
      offsetX = (containerWidth - drawWidth) / 2;
    } else {
      // Imagem é mais alta que o contêiner
      drawWidth = containerWidth;
      drawHeight = drawWidth / imgRatio;
      offsetY = (containerHeight - drawHeight) / 2;
    }
    
    // Desenhar a imagem com dimensões proporcionais
    ctx.drawImage(this.currentImage, offsetX, offsetY, drawWidth, drawHeight);
    
    // Restaurar o estado original do canvas
    ctx.restore();
    
    // Obter dados da imagem processada
    this.imageData = canvas.toDataURL('image/png');
    
    // Substituir a imagem original pela imagem processada
    this.currentImage.src = this.imageData;
    
    // Resetar transformações após salvar
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    this.updateImageTransform();
    
    // Remover os controles de edição
    this.removeControls();
    
    // Redefinir cursor para o padrão (não mais "move")
    if (this.currentImage) {
      this.currentImage.style.cursor = 'pointer';
    }
    
    // Feedback visual para o usuário
    this.showSaveConfirmation();
  }
  
  showSaveConfirmation() {
    // Criar elemento de confirmação
    const confirmation = document.createElement('div');
    confirmation.className = 'save-confirmation';
    confirmation.textContent = 'Imagem salva!';
    this.imageContainer.appendChild(confirmation);
    
    // Remover após animação
    setTimeout(() => {
      if (confirmation.parentNode) {
        confirmation.parentNode.removeChild(confirmation);
      }
    }, 2000);
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
