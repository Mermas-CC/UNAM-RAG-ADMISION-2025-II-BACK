    const chatBox = document.getElementById('chat-box');
    const messagesArea = document.getElementById('messages-area');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const welcomeSection = document.getElementById('welcome-section');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const inputDock = document.getElementById('input-dock');
    const userInputWelcome = document.getElementById('user-input-welcome');
    const sendBtnWelcome = document.getElementById('send-btn-welcome');
    const welcomeModalOverlay = document.getElementById('welcome-modal-overlay');
    const welcomeModalCloseBtn = document.getElementById('welcome-modal-close-btn');

    let conversationHistory = [];
    const MAX_MESSAGES = 20;
    let isConversationStarted = false;

    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active', sidebar.classList.contains('open'));
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    function toggleTheme() {
        const body = document.body;
        const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        document.getElementById('theme-icon').className = newTheme === 'light' ? 'fas fa-sun text-lg' : 'fas fa-moon text-lg';
        localStorage.setItem('theme', newTheme);
        const logo = document.getElementById('aimara-logo');
        if (logo) {
            logo.src = newTheme === 'light' ? logo.dataset.logoLight : logo.dataset.logoDark;
        }
    }
    
    function newConversation() {
        chatBox.innerHTML = '';
        welcomeSection.style.display = 'flex';
        chatBox.appendChild(welcomeSection);
        messagesArea.classList.remove('conversation-view');
        inputDock.style.display = 'none';
        conversationHistory = [];
        isConversationStarted = false;
        messagesArea.scrollTop = 0;
        welcomeModalOverlay.classList.add('visible');
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-icon').className = savedTheme === 'light' ? 'fas fa-sun text-lg' : 'fas fa-moon text-lg';
    }

    function scrollToBottom() {
        messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
    }

    function addToHistory(role, content) {
      conversationHistory.push({ role: role, parts: [{text: content}] });
      if (conversationHistory.length > MAX_MESSAGES) {
        conversationHistory.splice(0, conversationHistory.length - MAX_MESSAGES);
      }
    }
    
    function startConversation() {
        if (isConversationStarted) return;
        messagesArea.classList.add('conversation-view');
        welcomeSection.style.display = 'none';
        inputDock.style.display = 'block';
        isConversationStarted = true;
    }

    function addMessage(content, isUser = false) {
      startConversation();
      const wrapper = document.createElement('div');
      wrapper.className = `message-wrapper ${isUser ? 'user' : 'bot'}`;
      wrapper.innerHTML = `<div class="avatar"><i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i></div><div class="message-content">${content}</div>`;
      chatBox.appendChild(wrapper);
      scrollToBottom();
      return wrapper.querySelector('.message-content');
    }

    function addTypingIndicator() {
      const wrapper = document.createElement('div');
      wrapper.id = 'typing-indicator';
      wrapper.className = 'message-wrapper bot typing-indicator';
      wrapper.innerHTML = `<div class="avatar"><i class="fas fa-robot"></i></div><div class="message-content"><span></span><span></span><span></span></div>`;
      chatBox.appendChild(wrapper);
      scrollToBottom();
      return wrapper;
    }

    function renderSuggestions(suggestions) {
      const container = document.createElement('div');
      container.className = 'suggestion-chips';
      suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = text.trim();
        chip.onclick = () => sendExampleMessage(text.trim());
        container.appendChild(chip);
      });
      chatBox.appendChild(container);
      scrollToBottom();
    }

    function sendExampleMessage(message) {
      startConversation();
      userInput.value = message;
      userInput.dispatchEvent(new Event('input', { bubbles: true }));
      sendMessage();
    }

    async function sendMessage(fromWelcome = false) {
      if(welcomeModalOverlay.classList.contains('visible')) {
        welcomeModalOverlay.classList.remove('visible');
      }

      const inputEl = fromWelcome ? userInputWelcome : userInput;
      const btnEl = fromWelcome ? sendBtnWelcome : sendBtn;
      const message = inputEl.value.trim();
      if (!message) return;

      startConversation();
      addToHistory("user", message);
      addMessage(message, true);
      
      inputEl.value = '';
      inputEl.style.height = 'auto';
      btnEl.disabled = true;

      const typingIndicator = addTypingIndicator();

      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, history: conversationHistory }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        typingIndicator.remove();
        const botMessageDiv = addMessage('', false);
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value, { stream: true });
          
          const separator = "---";
          const mainMessage = fullResponse.split(separator)[0];

          botMessageDiv.innerHTML = marked.parse(mainMessage);
          scrollToBottom();
        }

        const separator = "---";
        const parts = fullResponse.split(separator);
        if (parts.length > 1) {
          const suggestions = parts[1].split('\n').filter(s => s.trim().startsWith('*')).map(s => s.replace('*', '').trim());
          if(suggestions.length > 0) renderSuggestions(suggestions);
        }

        addToHistory("model", fullResponse);

      } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        addMessage('Hubo un error al procesar tu solicitud.', false);
      }
    }

    function setupInputEvents(inputElement, buttonElement, isWelcome = false) {
        if (!inputElement || !buttonElement) return;
        
        const handler = () => {
            inputElement.style.height = 'auto';
            inputElement.style.height = `${Math.min(inputElement.scrollHeight, 120)}px`;
            buttonElement.disabled = inputElement.value.trim().length === 0;
        };

        const keydownHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!buttonElement.disabled) sendMessage(isWelcome);
            }
        };

        inputElement.addEventListener('input', handler);
        inputElement.addEventListener('keydown', keydownHandler);
        buttonElement.addEventListener('click', () => sendMessage(isWelcome));
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        setupInputEvents(userInput, sendBtn, false);
        setupInputEvents(userInputWelcome, sendBtnWelcome, true);
        
        welcomeModalOverlay.classList.add('visible');

        welcomeModalCloseBtn.addEventListener('click', () => {
            welcomeModalOverlay.classList.remove('visible');
        });
        
        userInputWelcome.addEventListener('focus', () => {
            if(welcomeModalOverlay.classList.contains('visible')) {
              welcomeModalOverlay.classList.remove('visible');
            }
        });
    });