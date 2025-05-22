// documentation-script.js
document.addEventListener('DOMContentLoaded', () => {
    const btnDavidsFarm = document.getElementById('doc-btn-davidsfarm');
    const btnPollutionZero = document.getElementById('doc-btn-pollutionzero');

    const currentPageContentElement = document.getElementById('current-page-content');
    const docContentArea = document.querySelector('.doc-content-area');
    const docPlaceholder = document.getElementById('doc-placeholder');

    const selectionFeedback = document.getElementById('doc-selection-feedback');

    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');

    // Navegação de páginas
    const pageNavigationControls = document.getElementById('page-navigation-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageIndicator = document.getElementById('page-indicator');

    let currentVisibleDocType = null;
    let currentDocumentPages = [];
    let currentPageIndex = 0;
    let hasScrolledToBottomOnce = false;
    let intersectionObserver;

    if (!currentPageContentElement || !docContentArea || !docPlaceholder || !pageNavigationControls || !prevPageBtn || !nextPageBtn || !pageIndicator) {
        console.error("Elementos essenciais da documentação ou paginação não encontrados! Verifique os IDs no HTML.");
        return;
    }
    if (!popupOverlay || !popupCloseButton || !popupContent) {
        console.error("Elementos do pop-up não encontrados! Verifique os IDs em Documentation.html.");
    }

    // --- CONTEÚDO DAS DOCUMENTAÇÕES DIVIDIDO EM PÁGINAS ---
    const davidsFarmDocPages = [
        `<h3>David's Farm - Documentação Completa</h3>
         <p>Todos os sprites foram criados no aplicativo ASEPRITE para computador, a maioria feitos em casa.</p>
         <p>A programação foi totalmente realizada por Deon (Gabriel Marques), utilizando o programa Scratch e <strong>NÃO DEVE SER UTILIZADA EM OUTROS PROJETOS</strong>. Caso contrário, o projeto será reportado.</p>
         <p>A parte sonora do game foi feita no site "suno.ai", e "elevenlabs", disponível em todos os dispositivos.</p>
         <hr class="doc-separator">
         <h4>Agradecimentos</h4>
         <p>Agradeço a todos que apoiaram o projeto, especialmente ao professor Diesse, à equipe pedagógica do Colégio Estadual Cívico Militar Douradina e ao embaixador de programação Edmilson Coelho. Agradeço também aos meus amigos que me ajudaram MUITO testando o jogo: Rafael Silva, Estevan Lopes, Lucas Emanuel, João Gabriel, Yraê Bassan, Mateus Fonseca, Daniel Senzaki e ao Pedro Gomes. Os agradecimentos especiais serão mostrados ao finalizar o jogo.</p>
         <p>Obrigado também a você! Você que jogou o jogo, obrigado e parabéns. Se puder deixar o like e marcar o jogo como favorito, agradeço. Estamos juntos! &lt;3</p>`,

        `<h4>Avisos Importantes</h4>
         <p class="warning-note">O JOGO É PESADO, ESPERE 1 MINUTO OU MAIS PARA INICIAR. SE O JOGO AINDA CORROMPER, USE O TURBOWARP. (Idêntico ao Scratch, mas roda o jogo em JavaScript.) Se antes de clicar na bandeira verde, aparecer alguma caixa cinza com o símbolo "?" dentro dela, por favor, reinicie a página.</p>
         <p>Projeto no TurboWarp: <a href="https://turbowarp.org/1005715087" target="_blank" rel="noopener noreferrer">https://turbowarp.org/1005715087</a></p>
         <p>Caso queira baixar o jogo, entre na Itch.io: <a href="https://eusoudeon.itch.io/davidsfarm" target="_blank" rel="noopener noreferrer">https://eusoudeon.itch.io/davidsfarm</a></p>
         <p class="performance-note">O jogo possui requisitos elevados de desempenho, o que pode resultar em atrasos, lentidão, travamentos e até corrosão dos arquivos durante o carregamento. Use o site do TurboWarp para evitar isso.</p>
         <p class="inspiration-note">[JOGO FORTEMENTE INSPIRADO EM: Super Chicken Jumper, UNDERTALE e DELTARUNE]</p>`,

        `<h4>Introdução ao Jogo</h4>
         <p>Seja bem-vindo à David's Farm! Um jogo desenvolvido para o concurso Agrinho na categoria de programação.</p>
         <p><strong>Sinopse:</strong> Você, como David, estava voltando para sua fazenda quando, de repente, avista pestes maiores do que as habituais se alimentando dos seus frutos. Armado com uma foice, você decide enfrentá-las para proteger sua colheita. Mas algo inesperado acontece, alguém misterioso invade a sua fazenda e rouba o seu milharal. E agora, o que irá fazer?</p>
         <p>No começo do jogo, coloque o seu nome.</p>
         <hr class="doc-separator">
         <h4>Instruções de Jogo</h4>
         <p class="controls-note">[USE A TECLA "Z" PARA INTERAGIR COM OS OBJETOS NO CENÁRIO]</p>
         <p class="controls-note">[PRESSIONE "1" PARA RESETAR A RESPOSTA, CASO FOR ESCRITA ERRADA]</p>`,

        `<ul>
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
         <p style="text-align:center; margin-top:20px;">Com amor, Gab :)</p>`
    ];

    const pollutionZeroDocPages = [
        `<h3>Pollution Zero</h3>
         <p class="development-notice">Este projeto está atualmente sendo desenvolvido.</p>
         <p class="development-notice">Mais informações e detalhes da documentação estarão disponíveis em breve!</p>
         <p class="development-notice">Agradecemos a sua paciência e entusiasmo. Volte em breve! <i class="fas fa-tools"></i></p>`
    ];

    function setupIntersectionObserverForPage() {
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }
        if (!currentPageContentElement) return;

        const elements = currentPageContentElement.querySelectorAll('h3, h4, p, ul, hr, li, a, strong, em, .inspiration-note, .warning-note, .performance-note, .controls-note, .copyright-note');
        elements.forEach(el => {
            el.classList.add('animate-on-scroll');
            el.classList.remove('is-visible');
        });

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    // Não remover 'is-visible' ao sair da viewport para evitar re-animação constante ao rolar para cima/baixo na mesma página
                    // A menos que a animação de "sumir" seja desejada para todos os tipos de documentos
                    if (currentVisibleDocType === 'davidsfarm' && !entry.target.classList.contains('no-remove-on-exit')) { // Adicione 'no-remove-on-exit' para elementos que não devem sumir
                         // entry.target.classList.remove('is-visible');
                    }
                }
            });
        }, observerOptions);

        elements.forEach(el => intersectionObserver.observe(el));
    }


    function renderPage(pageIndex, direction = 'next') {
        if (!currentDocumentPages || pageIndex < 0 || pageIndex >= currentDocumentPages.length) {
            return;
        }

        const oldPageContent = currentPageContentElement.innerHTML;

        // Animação de saída da página antiga
        if (oldPageContent && currentPageContentElement.classList.contains('page-active')) {
            currentPageContentElement.classList.remove('page-active');
            if (direction === 'next') {
                currentPageContentElement.classList.add('page-exit-left');
            } else {
                currentPageContentElement.classList.add('page-exit-right');
            }
        }
        
        // Atraso para a animação de saída antes de carregar o novo conteúdo
        setTimeout(() => {
            currentPageIndex = pageIndex;
            currentPageContentElement.innerHTML = currentDocumentPages[currentPageIndex];
            pageIndicator.textContent = `Página ${currentPageIndex + 1} de ${currentDocumentPages.length}`;

            // Prepara para animação de entrada
            currentPageContentElement.classList.remove('page-exit-left', 'page-exit-right', 'page-enter-from-left', 'page-enter-from-right');
            
            // Força reflow para reiniciar a animação
            void currentPageContentElement.offsetWidth; 

            if (direction === 'next') {
                currentPageContentElement.classList.add('page-enter-from-right');
            } else {
                currentPageContentElement.classList.add('page-enter-from-left');
            }
            currentPageContentElement.classList.add('page-active');
            
            // Remove classes de animação após a conclusão
            currentPageContentElement.addEventListener('animationend', () => {
                currentPageContentElement.classList.remove('page-enter-from-right', 'page-enter-from-left');
            }, { once: true });

            updatePageNavButtons();
            setupIntersectionObserverForPage(); // Configura animações para o novo conteúdo da página
            currentPageContentElement.scrollTop = 0; // Rola para o topo da nova página
            docContentArea.scrollTop = 0; // Rola o container da área de conteúdo para o topo
            
            // Rola a janela para o topo da área de documentação suavemente
            const headerElement = document.querySelector('header');
            const headerHeight = headerElement ? headerElement.offsetHeight : 60;
            const targetScrollPosition = docContentArea.offsetTop - headerHeight - 20; // 20px de margem
            window.scrollTo({ top: targetScrollPosition, behavior: 'smooth' });


        }, currentPageContentElement.innerHTML ? 300 : 0); // 300ms para a animação de saída, 0 se for a primeira página
    }


    function updatePageNavButtons() {
        prevPageBtn.disabled = currentPageIndex === 0;
        nextPageBtn.disabled = currentPageIndex === currentDocumentPages.length - 1;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPageIndex > 0) {
            renderPage(currentPageIndex - 1, 'prev');
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPageIndex < currentDocumentPages.length - 1) {
            renderPage(currentPageIndex + 1, 'next');
        }
    });


    function showDocContent(contentType) {
        currentVisibleDocType = contentType;
        hasScrolledToBottomOnce = false; // Reset para o popup da medalha

        docPlaceholder.style.display = 'none';
        selectionFeedback.style.display = 'none';
        currentPageContentElement.innerHTML = ''; // Limpa conteúdo anterior
        currentPageContentElement.className = 'book-page'; // Reseta classes de animação


        btnDavidsFarm.classList.remove('active');
        btnPollutionZero.classList.remove('active');

        let feedbackText = "";

        if (contentType === 'davidsfarm') {
            currentDocumentPages = davidsFarmDocPages;
            btnDavidsFarm.classList.add('active');
            feedbackText = "DAVID'S FARM: Documentação";
        } else if (contentType === 'pollutionzero') {
            currentDocumentPages = pollutionZeroDocPages;
            btnPollutionZero.classList.add('active');
            feedbackText = "POLLUTION ZERO: Documentação";
        } else {
            currentDocumentPages = [];
            docPlaceholder.style.display = 'block';
            pageNavigationControls.style.display = 'none';
            if (intersectionObserver) intersectionObserver.disconnect();
            return;
        }

        if (currentDocumentPages.length > 0) {
            pageNavigationControls.style.display = 'flex';
            renderPage(0, 'next'); // Renderiza a primeira página
        } else {
            docPlaceholder.innerHTML = "<p>Documentação não encontrada ou vazia.</p>";
            docPlaceholder.style.display = 'block';
            pageNavigationControls.style.display = 'none';
            if (intersectionObserver) intersectionObserver.disconnect();
        }

        if (selectionFeedback && feedbackText) {
            selectionFeedback.textContent = feedbackText;
            selectionFeedback.style.display = 'block';
            selectionFeedback.style.opacity = '0';
            setTimeout(() => { selectionFeedback.style.opacity = '1'; }, 50);
            setTimeout(() => {
                if (selectionFeedback) selectionFeedback.style.opacity = '0';
                setTimeout(() => { if (selectionFeedback) selectionFeedback.style.display = 'none'; }, 500);
            }, 2000);
        }

        // O scroll para o topo da área de documentação é feito dentro de renderPage
    }

    if (btnDavidsFarm) {
        btnDavidsFarm.addEventListener('click', () => showDocContent('davidsfarm'));
    }
    if (btnPollutionZero) {
        btnPollutionZero.addEventListener('click', () => showDocContent('pollutionzero'));
    }

    // Pop-up Global (Lógica da medalha)
    const openGlobalPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closeGlobalPopup = () => {
        if (popupOverlay) {
            popupOverlay.classList.remove('visible');
            const popupDialog = popupOverlay.querySelector('.custom-popup');
            if (popupDialog) popupDialog.classList.remove('medal-popup-animation');
            if (popupContent) popupContent.innerHTML = '';
        }
    };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closeGlobalPopup);
    if (popupOverlay) {
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) { // Clica fora do conteúdo do popup
                closeGlobalPopup();
            }
        });
    }

    function checkScrollPositionForMedal() {
        if (currentVisibleDocType !== 'davidsfarm' || currentPageIndex !== currentDocumentPages.length -1) { // Só na última página de David's Farm
            return;
        }

        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;

        if (!hasScrolledToBottomOnce && (scrollPosition >= pageHeight - 20)) {
            if (popupContent && popupOverlay && !popupOverlay.classList.contains('visible')) {
                hasScrolledToBottomOnce = true;
                console.log("Disparando pop-up da medalha para David's Farm!");

                popupContent.innerHTML = `
                    <div class="medal-popup-content-wrapper"> <img src="imgs/medalha-agrinho.png" alt="Medalha Agrinho" class="medal-image" onerror="this.style.display='none'; console.error('Imagem da medalha não encontrada: imgs/medalha-agrinho.png')">
                        <h3>Uma Conquista para Celebrar!</h3>
                        <p>Você sabia que o 'David's Farm' ganhou a edição do Agrinho de 2024?</p>
                        <p>Pois é! Legal, não é?</p>
                        <hr style="border-color: #444; margin: 10px 0 12px 0;">
                        <p class="agradecimento-longo"><em>Em nome de toda a equipe que trabalhou com carinho e dedicação neste projeto, queremos agradecer de coração a cada pessoa que entrou, explorou e se divertiu no mundo da nossa fazenda!</em></p>
                        <p class="agradecimento-longo"><em>David's Farm foi feito com muito amor para o concurso Agrinho, com o objetivo de ensinar, entreter e mostrar a importância do campo, do cuidado com a natureza e da união entre as pessoas. Ver vocês jogando, rindo, descobrindo cada cantinho da fazenda e compartilhando a experiência fez tudo valer a pena.</em></p>
                        <p class="agradecimento-longo"><em>Cada jogador, cada minuto jogado, cada feedback e apoio... tudo isso fez parte da nossa história.</em></p>
                        <p class="agradecimento-longo"><em>Muito obrigado por fazerem parte dessa jornada.</em></p>
                        <p class="signature" style="margin-top: 15px; font-size:0.9em;">E lembrem-se: o futuro do campo também está nas nossas mãos! 🌱<br>- Deon</p>
                    </div>
                    <div class="popup-actions" style="margin-top:20px;">
                        <button id="popup-medal-close-btn" class="popup-apply-button">Legal!</button>
                    </div>`;
                const popupDialog = popupOverlay.querySelector('.custom-popup');
                if (popupDialog) {
                    popupDialog.classList.add('medal-popup-animation'); // Para aplicar max-width e animação de entrada
                }
                popupContent.classList.add('medal-popup'); // Para estilos de texto e imagem

                const medalCloseBtn = popupContent.querySelector('#popup-medal-close-btn');
                if (medalCloseBtn) {
                    medalCloseBtn.addEventListener('click', closeGlobalPopup);
                }
                openGlobalPopup();
            }
        }
    }

    window.addEventListener('scroll', checkScrollPositionForMedal, { passive: true });

    // Estado inicial
    docPlaceholder.style.display = 'block';
    pageNavigationControls.style.display = 'none';

    console.log("Documentation Script (vBookLayout) Carregado!");
});