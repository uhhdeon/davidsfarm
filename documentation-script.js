// documentation-script.js
// ETAPA 10.3: Scroll Suave CSS e Mensagem "Sendo Desenvolvido" para Pollution Zero
document.addEventListener('DOMContentLoaded', () => {
    const btnDavidsFarm = document.getElementById('doc-btn-davidsfarm');
    const btnPollutionZero = document.getElementById('doc-btn-pollutionzero');
    
    const contentDavidsFarm = document.getElementById('doc-content-davidsfarm');
    const contentPollutionZero = document.getElementById('doc-content-pollutionzero');
    const docContentArea = document.querySelector('.doc-content-area'); 
    const docPlaceholder = document.getElementById('doc-placeholder');
    
    const selectionFeedback = document.getElementById('doc-selection-feedback');

    const popupOverlay = document.getElementById('custom-popup-overlay'); 
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');

    let currentVisibleDocType = null; 
    let hasScrolledToBottomOnce = false;
    let intersectionObserver;

    if (!popupOverlay || !popupCloseButton || !popupContent) {
        console.error("Elementos do pop-up não encontrados! Verifique os IDs em Documentation.html.");
    }
    if (!docContentArea) {
        console.error("Elemento '.doc-content-area' não encontrado! Verifique a classe no HTML.");
    }

    const davidsFarmText = `
        <h3>David's Farm - Documentação Completa</h3>
        <p>Todos os sprites foram criados no aplicativo ASEPRITE para computador, a maioria feitos em casa.</p>
        <p>A programação foi totalmente realizada por Deon (Gabriel Marques), utilizando o programa Scratch e <strong>NÃO DEVE SER UTILIZADA EM OUTROS PROJETOS</strong>. Caso contrário, o projeto será reportado.</p>
        <p>A parte sonora do game foi feita no site "suno.ai", e "elevenlabs", disponível em todos os dispositivos.</p>
        
        <h4>Agradecimentos</h4>
        <p>Agradeço a todos que apoiaram o projeto, especialmente ao professor Diesse, à equipe pedagógica do Colégio Estadual Cívico Militar Douradina e ao embaixador de programação Edmilson Coelho. Agradeço também aos meus amigos que me ajudaram MUITO testando o jogo: Rafael Silva, Estevan Lopes, Lucas Emanuel, João Gabriel, Yraê Bassan, Mateus Fonseca, Daniel Senzaki e ao Pedro Gomes. Os agradecimentos especiais serão mostrados ao finalizar o jogo.</p>
        <p>Obrigado também a você! Você que jogou o jogo, obrigado e parabéns. Se puder deixar o like e marcar o jogo como favorito, agradeço. Estamos juntos! &lt;3</p>
        
        <p class="inspiration-note">[JOGO FORTEMENTE INSPIRADO EM: Super Chicken Jumper, UNDERTALE e DELTARUNE]</p>
        <hr class="doc-separator">
        <h4>Avisos Importantes</h4>
        <p class="warning-note">O JOGO É PESADO, ESPERE 1 MINUTO OU MAIS PARA INICIAR. SE O JOGO AINDA CORROMPER, USE O TURBOWARP. (Idêntico ao Scratch, mas roda o jogo em JavaScript.) Se antes de clicar na bandeira verde, aparecer alguma caixa cinza com o símbolo "?" dentro dela, por favor, reinicie a página.</p>
        <p>Projeto no TurboWarp: <a href="https://turbowarp.org/1005715087" target="_blank" rel="noopener noreferrer">https://turbowarp.org/1005715087</a></p>
        <p>Caso queira baixar o jogo, entre na Itch.io: <a href="https://eusoudeon.itch.io/davidsfarm" target="_blank" rel="noopener noreferrer">https://eusoudeon.itch.io/davidsfarm</a></p>
        <p class="performance-note">O jogo possui requisitos elevados de desempenho, o que pode resultar em atrasos, lentidão, travamentos e até corrosão dos arquivos durante o carregamento. Use o site do TurboWarp para evitar isso.</p>
        <hr class="doc-separator">
        <h4>Introdução ao Jogo</h4>
        <p>Seja bem-vindo à David's Farm! Um jogo desenvolvido para o concurso Agrinho na categoria de programação.</p>
        <p><strong>Sinopse:</strong> Você, como David, estava voltando para sua fazenda quando, de repente, avista pestes maiores do que as habituais se alimentando dos seus frutos. Armado com uma foice, você decide enfrentá-las para proteger sua colheita. Mas algo inesperado acontece, alguém misterioso invade a sua fazenda e rouba o seu milharal. E agora, o que irá fazer?</p>
        <p>No começo do jogo, coloque o seu nome.</p>
        <h4>Instruções de Jogo</h4>
        <p class="controls-note">[USE A TECLA "Z" PARA INTERAGIR COM OS OBJETOS NO CENÁRIO]</p>
        <p class="controls-note">[PRESSIONE "1" PARA RESETAR A RESPOSTA, CASO FOR ESCRITA ERRADA]</p>
        <ul>
            <li><strong>Primeira Fase:</strong> Movimente-se com WASD e use o botão esquerdo do mouse para atacar. Se estiver jogando no celular, utilize os botões na tela.</li>
            <li><strong>Segunda Fase (Início):</strong> Movimente-se com WASD e use o botão esquerdo do mouse para arar a terra. Arar todas as 44 parcelas indicadas na tela é necessário.</li>
            <li><strong>Segunda Fase (Pós-Arar):</strong> Movimente-se com WASD e use o botão esquerdo do mouse para plantar milho. Plante milho em todas as 44 parcelas disponíveis.</li>
            <li><strong>Terceira Fase:</strong> Entre na casa de Mors e procure por ele.</li>
            <li><strong>Quarta Fase:</strong> Desvie da nova espécie assassina dirigindo um carro pela rua usando WASD. Cuidado, pois o carro é mais difícil de controlar e pode afogar.</li>
        </ul>
        <p>Divirta-se jogando e boa sorte!</p>
        <hr class="doc-separator">
        <p><em>O Tutorial também está disponível no jogo.</em></p>
        <h4>Extra:</h4>
        <p class="copyright-note">- Todos os sprites e programação são autorias, portanto, não os roube nem faça remixes do projeto.</p>
        <hr class="doc-separator">
        <p style="text-align:center; margin-top:20px;">Com amor, Gab :)</p>
    `;

    const pollutionZeroText = `
        <h3>Pollution Zero</h3>
        <p class="development-notice">Este projeto está atualmente sendo desenvolvido.</p>
        <p class="development-notice">Mais informações e detalhes da documentação estarão disponíveis em breve!</p>
        <p class="development-notice">Agradecemos a sua paciência e entusiasmo. Volte em breve! <i class="fas fa-tools"></i></p>
    `; // NOVO TEXTO

    if (contentDavidsFarm) {
        contentDavidsFarm.innerHTML = davidsFarmText;
    }
    if (contentPollutionZero) { // Preenche o conteúdo de Pollution Zero
        contentPollutionZero.innerHTML = pollutionZeroText;
    }


    const openGlobalPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closeGlobalPopup = () => { 
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
            const popupDialog = popupOverlay.querySelector('.custom-popup');
            if(popupDialog) popupDialog.classList.remove('medal-popup-animation'); 
            if(popupContent) popupContent.innerHTML = ''; 
        }
    };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closeGlobalPopup);
    if (popupOverlay) { 
        popupOverlay.addEventListener('click', (e) => { 
            if (e.target === popupOverlay && popupContent && !popupContent.contains(e.target)) {
                closeGlobalPopup();
            }
        });
    }

    function setupIntersectionObserver(contentElement) {
        if (intersectionObserver) {
            intersectionObserver.disconnect(); 
        }
        if (!contentElement) return; 

        const elements = contentElement.querySelectorAll('h3, h4, p, ul, hr, .inspiration-note, .warning-note, .performance-note, .controls-note, .copyright-note');
        elements.forEach(el => {
            el.classList.add('animate-on-scroll'); 
            el.classList.remove('is-visible');   
        });

        const observerOptions = {
            root: null, 
            rootMargin: '0px',
            threshold: 0.1 
        };

        intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    if (currentVisibleDocType === 'davidsfarm') { // Animação de sumir/reaparecer só para David's Farm
                        entry.target.classList.remove('is-visible');
                    }
                }
            });
        }, observerOptions);

        elements.forEach(el => {
            intersectionObserver.observe(el);
        });
    }


    function showDocContent(contentType) {
        currentVisibleDocType = contentType; 

        if (contentDavidsFarm) contentDavidsFarm.style.display = 'none';
        if (contentPollutionZero) contentPollutionZero.style.display = 'none';
        if (docPlaceholder) docPlaceholder.style.display = 'none';
        if (selectionFeedback) selectionFeedback.style.display = 'none'; 

        if (btnDavidsFarm) btnDavidsFarm.classList.remove('active');
        if (btnPollutionZero) btnPollutionZero.classList.remove('active');

        let feedbackText = "";
        let currentContentElement = null; 

        if (contentType === 'davidsfarm' && contentDavidsFarm) {
            contentDavidsFarm.style.display = 'block';
            if (btnDavidsFarm) btnDavidsFarm.classList.add('active');
            feedbackText = "DAVID'S FARM: 1";
            currentContentElement = contentDavidsFarm;
        } else if (contentType === 'pollutionzero' && contentPollutionZero) {
            contentPollutionZero.style.display = 'block';
            if (btnPollutionZero) btnPollutionZero.classList.add('active');
            feedbackText = "POLLUTION ZERO: 1";
            currentContentElement = contentPollutionZero;
            if (intersectionObserver) { // Desconecta observer se não for David's Farm
                intersectionObserver.disconnect();
                // Garante que os textos de Pollution Zero (que não usam observer) estejam visíveis
                 const pollutionElements = contentPollutionZero.querySelectorAll('h3, p');
                 pollutionElements.forEach(el => {
                    el.classList.remove('animate-on-scroll'); // Remove classes de animação por scroll
                    el.classList.add('is-visible'); // Torna visível diretamente
                    el.style.opacity = '1'; // Garante opacidade
                    el.style.transform = 'translateY(0)'; // Garante posição
                 });
            }
        } else if (docPlaceholder) {
            docPlaceholder.style.display = 'block';
            if (intersectionObserver) { 
                intersectionObserver.disconnect();
            }
        }

        if (currentContentElement && contentType === 'davidsfarm') { 
            setupIntersectionObserver(currentContentElement); 
        }


        if (selectionFeedback && feedbackText) {
            selectionFeedback.textContent = feedbackText;
            selectionFeedback.style.display = 'block';
            selectionFeedback.style.opacity = '0';
            setTimeout(() => { selectionFeedback.style.opacity = '1'; }, 50);
            setTimeout(() => { 
                if (selectionFeedback) selectionFeedback.style.opacity = '0';
                setTimeout(() => { if (selectionFeedback) selectionFeedback.style.display = 'none';}, 500);
            }, 2000); 
        }
        hasScrolledToBottomOnce = false; 
        
        if (docContentArea) { 
            setTimeout(() => {
                const headerElement = document.querySelector('header');
                const headerHeight = headerElement ? headerElement.offsetHeight : 60; 
                const targetScrollPosition = docContentArea.offsetTop - headerHeight - 10; // 10px de margem
                window.scrollTo({ top: targetScrollPosition, behavior: 'smooth' }); // 'smooth' já está aqui
            }, 50); 
        } else {
            console.error(".doc-content-area não encontrado para scroll.");
        }
    }

    if (btnDavidsFarm) {
        btnDavidsFarm.addEventListener('click', () => showDocContent('davidsfarm'));
    }
    if (btnPollutionZero) {
        btnPollutionZero.addEventListener('click', () => showDocContent('pollutionzero'));
    }

    if (docPlaceholder) docPlaceholder.style.display = 'block';

    function checkScrollPositionForMedal() {
        if (currentVisibleDocType !== 'davidsfarm') { // Só mostra medalha para David's Farm
            return;
        }

        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        
        if (!hasScrolledToBottomOnce && (scrollPosition >= pageHeight - 20)) { 
            if (popupContent && popupOverlay && !popupOverlay.classList.contains('visible')) { 
                hasScrolledToBottomOnce = true; 
                console.log("Disparando pop-up da medalha para David's Farm!");
                
                popupContent.innerHTML = `
                    <div class="medal-popup">
                        <img src="imgs/medalha-agrinho.png" alt="Medalha Agrinho" class="medal-image" onerror="this.style.display='none'; console.error('Imagem da medalha não encontrada: imgs/medalha-agrinho.png')">
                        <h3>Uma Conquista para Celebrar!</h3>
                        <p>Você sabia que o 'David's Farm' ganhou a edição do Agrinho de 2025?</p>
                        <p>Pois é! Legal, não é?</p>
                        <hr style="border-color: #444; margin: 10px 0 12px 0;">
                        <p class="agradecimento-longo"><em>Em nome de toda a equipe que trabalhou com carinho e dedicação neste projeto, queremos agradecer de coração a cada pessoa que entrou, explorou e se divertiu no mundo da nossa fazenda!</em></p>
                        <p class="agradecimento-longo"><em>David's Farm foi feito com muito amor para o concurso Agrinho, com o objetivo de ensinar, entreter e mostrar a importância do campo, do cuidado com a natureza e da união entre as pessoas. Ver vocês jogando, rindo, descobrindo cada cantinho da fazenda e compartilhando a experiência fez tudo valer a pena.</em></p>
                        <p class="agradecimento-longo"><em>Cada jogador, cada minuto jogado, cada feedback e apoio... tudo isso fez parte da nossa história.</em></p>
                        <p class="agradecimento-longo"><em>Muito obrigado por fazerem parte dessa jornada.</em></p>
                        <p class="signature" style="margin-top: 15px; font-size:0.9em;">E lembrem-se: o futuro do campo também está nas nossas mãos! 🌱<br>- Deon</p>
                        <div class="popup-actions" style="margin-top:20px;">
                            <button id="popup-medal-close-btn" class="popup-apply-button">Legal!</button>
                        </div>
                    </div>
                `;
                const popupDialog = popupOverlay.querySelector('.custom-popup');
                if(popupDialog) {
                    popupDialog.classList.add('medal-popup-animation');
                    popupContent.classList.add('medal-popup'); 
                }

                const medalCloseBtn = popupContent.querySelector('#popup-medal-close-btn');
                if (medalCloseBtn) {
                    medalCloseBtn.addEventListener('click', closeGlobalPopup);
                }
                openGlobalPopup();
            }
        }
    }
    
    window.addEventListener('scroll', checkScrollPositionForMedal, { passive: true });
    
    console.log("Documentation Script (vCom Scroll Suave CSS e Condicionais) Carregado!");
});