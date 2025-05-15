document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const siteContent = document.getElementById('site-content');
    const currentYearSpan = document.getElementById('currentYear');
    const particlesContainer = document.getElementById('background-particles');
    const numberOfParticles = 30; // Quantidade de bolinhas

    // Atualiza o ano no rodapé
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Função para criar partículas
    function createParticles() {
        if (!particlesContainer) return;
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            // Posição horizontal aleatória
            particle.style.left = `${Math.random() * 100}%`;

            // Tamanho aleatório
            const size = Math.random() * 10 + 5; // Tamanho entre 5px e 15px
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // Delay e duração da animação 'rise' aleatórios para mais naturalidade
            // A animação 'rise' já está definida no CSS para subir.
            // Vamos randomizar a duração para que elas subam em velocidades diferentes
            // e o delay para que não comecem todas ao mesmo tempo.
            const duration = Math.random() * 10 + 10; // Duração entre 10s e 20s
            const delay = Math.random() * 10;       // Delay inicial até 10s

            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `-${delay}s`; // Delay negativo inicia parte da animação

            // Posição Y inicial aleatória para que não comecem todas na base
            particle.style.bottom = `${Math.random() * -50 - 50}vh`; // Começa um pouco abaixo da tela

            particlesContainer.appendChild(particle);

            // Reinicia a partícula quando a animação 'rise' termina
            // Isso é uma forma de fazer o loop. A animação CSS já é 'infinite'.
            // O que podemos fazer é re-randomizar algumas propriedades no 'animationiteration'
            particle.addEventListener('animationiteration', () => {
                // Quando uma iteração da animação 'rise' termina, reposicionamos
                particle.style.left = `${Math.random() * 100}%`;
                const newSize = Math.random() * 10 + 5;
                particle.style.width = `${newSize}px`;
                particle.style.height = `${newSize}px`;
                // O CSS já cuida do loop da animação 'rise' com 'infinite'
                // A propriedade 'bottom' não precisa ser resetada aqui pois 'rise' move a partir da pos. inicial
            });
        }
    }

    // Simula um tempo de carregamento
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');

        loadingScreen.addEventListener('transitionend', () => {
            if (loadingScreen.parentNode) { // Verifica se o elemento ainda está no DOM
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
            // Torna o conteúdo do site visível para iniciar as animações CSS
            siteContent.classList.remove('hidden'); // Remove hidden
            siteContent.classList.add('visible');   // Adiciona visible para a transição de opacidade do container

            // As animações CSS no header, logo, main e footer começarão
            // devido às definições e delays no CSS.

            // Cria as partículas DEPOIS que a tela de loading sumir
            createParticles();

        }, { once: true });

    }, 1500); // Tempo de carregamento simulado (ajustado para 1.5s)

    console.log("David's Farm script v2 carregado e pronto!");
});