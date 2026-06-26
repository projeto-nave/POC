// =============================================
// CONFIGURAÇÃO
// =============================================

// ⚠️ O front roda no Live Server (porta 5500) e o backend FastAPI
// roda em outra porta (8000). Por isso TODA chamada precisa da URL
// completa do backend — caminhos relativos ("/auth/login-form")
// vão sempre bater no próprio Live Server, que não tem essas rotas.
const API_BASE_URL = 'https://api-backend-f9exb6cbghh5d3e3.westus2-01.azurewebsites.net';
//const API_BASE_URL = 'http://127.0.0.1:8000';
// =============================================
// UTILITÁRIOS
// =============================================

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function getAuthHeaders(isJson = true) {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}



// Adiciona uma "bolha" de mensagem no chat, usando as classes CSS
// do layout (mensagem-usuario / mensagem-sistema / mensagem-erro)
// em vez de estilo inline — mantém o CSS centralizado no <style>.
function adicionarMensagemNaView(conteudo, tipo = 'sistema') {
    const div = document.createElement('div');
    const classeMap = {
        usuario: 'mensagem-usuario',
        sistema: 'mensagem-sistema',
        erro: 'mensagem-erro',
    };
    div.className = classeMap[tipo] || 'mensagem-sistema';

    if (tipo === 'sistema') {
        div.innerHTML = conteudo;

        // botão escutar
        const listenBtn = document.createElement('button');
        listenBtn.textContent = "🎧 Escutar";
        listenBtn.className = "listen-btn";
        listenBtn.addEventListener('click', () => {
            const textoLimpo = limparTextoParaAudio(conteudo);
            speakText(textoLimpo, div, listenBtn); // passa o div e o próprio botão
        });

        div.appendChild(listenBtn);
    } else {
        div.textContent = conteudo;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}





function exibirMensagemForm(formEl, id, mensagem, cor) {
    let div = document.getElementById(id);
    if (!div) {
        div = document.createElement('p');
        div.id = id;
        div.className = 'mensagem-form';
        formEl.appendChild(div);
    }
    div.style.color = cor;
    div.textContent = mensagem;
}

function limparMensagemForm(id) {
    const div = document.getElementById(id);
    if (div) div.textContent = '';
}

// =============================================
// ELEMENTOS DO DOM
// =============================================

const openLoginBtn = document.getElementById('openLogin');
const closeLoginBtn = document.getElementById('closeLogin');
const loginModal = document.getElementById('loginModal');
const formLogin = document.getElementById('formLogin');
const logoutBtn = document.getElementById('logoutBtn');
const openCadastroHeader = document.getElementById('openCadastroHeader');

const openCadastroLink = document.getElementById('openCadastro');
const voltarLoginLink = document.getElementById('voltarLogin');
const closeCadastroBtn = document.getElementById('closeCadastro');
const cadastroModal = document.getElementById('cadastroModal');
const formCadastro = document.getElementById('formCadastro');

// Chat da Agente Nicole
const gatilhoAgente = document.getElementById('gatilhoAgente');
const fundoChat = document.getElementById('fundoChat');
const fecharChatBtn = document.getElementById('fecharChatBtn');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChat');
const chatMessages = document.getElementById('chatMessages');

// =============================================
// HELPERS DE MODAL (genéricos para qualquer .fundo-modal)
// =============================================

function abrirModal(modalEl) {
    modalEl.classList.add('active');
}

function fecharModal(modalEl) {
    modalEl.classList.remove('active');
}

// =============================================
// AUTENTICAÇÃO — Login / Logout
// =============================================

openLoginBtn.addEventListener('click', () => {
    if (localStorage.getItem('access_token')) return;
    abrirModal(loginModal);
});

closeLoginBtn.addEventListener('click', () => {
    fecharModal(loginModal);
});

loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) fecharModal(loginModal);
});

['email', 'password'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => limparMensagemForm('loginError'));
});

// Mensagem customizada em português para e-mail com formato inválido
// (ex: acentos como "ã" — não permitido pelos principais provedores reais).
const loginEmailInput = document.getElementById('email');
loginEmailInput.addEventListener('invalid', () => {
    loginEmailInput.setCustomValidity(
        'Digite um e-mail válido, sem acentos ou caracteres especiais (ex: joao@gmail.com).'
    );
});
loginEmailInput.addEventListener('input', () => {
    loginEmailInput.setCustomValidity('');
});

// -----------------------------------------------
// POST {API_BASE_URL}/auth/login-form (OAuth2PasswordRequestForm)
// -----------------------------------------------
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = formLogin.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login-form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: email, password: password }),
            credentials: 'include',
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error('Resposta inesperada do servidor: ' + text.substring(0, 80));
        }

        if (!response.ok) {
            throw new Error(data.detail || `Erro ${response.status}`);
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_email', email);

        fecharModal(loginModal);
        formLogin.reset();
        atualizarUI(email);

        if (fundoChat.classList.contains('active')) {
            await carregarHistorico();
        }

    } catch (error) {
        exibirMensagemForm(formLogin, 'loginError', '⚠ ' + error.message, '#dc3545');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
});

function atualizarUI(email) {
    if (email) {
        const nome = email.split('@')[0];
        const nomeFormatado = capitalize(nome)
        openLoginBtn.textContent = `👤 ${nomeFormatado}`;
        logoutBtn.style.display = 'inline-block';
        // ✅ CORRIGIDO: esconde "Cadastre-se" enquanto o usuário está logado —
        // antes ele continuava visível mesmo após o login.
        openCadastroHeader.style.display = 'none';

        chatMessages.innerHTML = `
            <div class="mensagem-sistema">
                Olá, ${nomeFormatado}! Sou Nicole, sua assistente virtual de inteligência artificial e sua astronauta guia nesta jornada pelas Naves do Conhecimento. Estou aqui para ajudar você a decolar nos recursos da Nave.Como posso ajudar você hoje?
            </div>`;
    } else {
        openLoginBtn.textContent = 'Área do usuário';
        logoutBtn.style.display = 'none';
        openCadastroHeader.style.display = 'inline-block';
    }
}

function fazerLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    atualizarUI(null);
    chatMessages.innerHTML = `
        <div class="mensagem-sistema">
            Olá! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a encontrar informações, conhecer os recursos das Naves do Conhecimento e esclarecer dúvidas sobre os serviços disponíveis. Como posso ajudar você hoje?
        </div>`;
}

logoutBtn.addEventListener('click', fazerLogout);

// =============================================
// CADASTRO — Criar Usuário
// =============================================

// Abre o modal de cadastro a partir do botão no cabeçalho
openCadastroHeader.addEventListener('click', () => {
    abrirModal(cadastroModal);
});

// Abre o modal de cadastro a partir do link no modal de login
openCadastroLink.addEventListener('click', (e) => {
    e.preventDefault();
    fecharModal(loginModal);
    abrirModal(cadastroModal);
});

// Volta para o modal de login a partir do link no modal de cadastro
voltarLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    fecharModal(cadastroModal);
    abrirModal(loginModal);
});

closeCadastroBtn.addEventListener('click', () => {
    fecharModal(cadastroModal);
});

cadastroModal.addEventListener('click', (e) => {
    if (e.target === cadastroModal) fecharModal(cadastroModal);
});

['cadNome', 'cadEmail', 'cadSenha', 'cadNascimento'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => limparMensagemForm('cadastroError'));
});

// Mensagem customizada em português quando o e-mail tem formato inválido
const cadEmailInput = document.getElementById('cadEmail');
cadEmailInput.addEventListener('invalid', () => {
    cadEmailInput.setCustomValidity(
        'Digite um e-mail válido, sem acentos ou caracteres especiais (ex: joao@gmail.com).'
    );
});
cadEmailInput.addEventListener('input', () => {
    cadEmailInput.setCustomValidity('');
});

// -----------------------------------------------
// POST {API_BASE_URL}/auth/criar_usuario
// -----------------------------------------------
formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cadNome').value.trim();
    const email = document.getElementById('cadEmail').value.trim();
    const senha = document.getElementById('cadSenha').value;
    const nascimento = document.getElementById('cadNascimento').value; // formato YYYY-MM-DD
    const submitBtn = formCadastro.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/criar_usuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                nascimento: nascimento, // já vem como "YYYY-MM-DD" do <input type="date">
            }),
            credentials: 'include',
        });

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error('Resposta inesperada do servidor: ' + text.substring(0, 80));
        }

        if (!response.ok) {
            // FastAPI manda erro de validação (422) como lista em data.detail,
            // ou string simples em casos como "Email já cadastrado" (400)
            if (Array.isArray(data.detail)) {
                console.error('Erro de validação (422):', data.detail);
                const msgErro = data.detail
                    .map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`)
                    .join(' | ');
                throw new Error(msgErro);
            }
            throw new Error(data.detail || `Erro ${response.status}`);
        }

        // ✅ Conta criada — avisa e já leva pro login preenchido
        formCadastro.reset();
        exibirMensagemForm(formCadastro, 'cadastroError', '✅ Conta criada! Faça login.', '#28a745');

        setTimeout(() => {
            limparMensagemForm('cadastroError');
            fecharModal(cadastroModal);
            abrirModal(loginModal);
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }, 1200);

    } catch (error) {
        exibirMensagemForm(formCadastro, 'cadastroError', '⚠ ' + error.message, '#dc3545');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cadastrar';
    }
});

// =============================================
// CHAT — Agente Nicole (Histórico / Mensagens)
// =============================================

gatilhoAgente.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModal(fundoChat);
    gatilhoAgente.style.display = 'none';
    carregarHistorico();
});

fecharChatBtn.addEventListener('click', () => {
    fecharModal(fundoChat);
    gatilhoAgente.style.display = 'block';
});

// Fecha o chat clicando fora da janela, igual aos outros modais,
// e reexibe o botão flutuante da agente.
fundoChat.addEventListener('click', (e) => {
    if (e.target === fundoChat) {
        fecharModal(fundoChat);
        gatilhoAgente.style.display = 'block';
    }
});

// -----------------------------------------------
// GET {API_BASE_URL}/messages/historico
// -----------------------------------------------
async function carregarHistorico() {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/historico`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        });

        if (!response.ok) throw new Error(`Erro ${response.status}`);

        const data = await response.json();
        chatMessages.innerHTML = '';

        if (data.mensagens && data.mensagens.length > 0) {
            data.mensagens.forEach(msg => {
                if (Array.isArray(msg)) {
                    msg.forEach(turno => renderizarMensagem(turno));
                } else {
                    renderizarMensagem(msg);
                }
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            // Verifica se há usuário logado
            const email = localStorage.getItem('user_email');
            if (email) {
                const nome = email.split('@')[0];
                const nomeFormatado = capitalize(nome);
                adicionarMensagemNaView(
                    `Olá, ${nomeFormatado}! Sou Nicole, sua assistente virtual de inteligência artificial e sua astronauta guia nesta jornada pelas Naves do Conhecimento. Estou aqui para ajudar você a decolar nos recursos da Nave.Como posso ajudar você hoje?`
                );
            } else {
                adicionarMensagemNaView(
                    'Olá! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a encontrar informações, conhecer os recursos das Naves do Conhecimento e esclarecer dúvidas sobre os serviços disponíveis. Como posso ajudar você hoje?'
                );
            }
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        adicionarMensagemNaView('❌ Não foi possível carregar o histórico.', 'erro');
    }
}

function renderizarMensagem(msg) {
    const tipo = msg.role === 'user' ? 'usuario' : 'sistema';
    adicionarMensagemNaView(msg.conteudo, tipo);
}

// -----------------------------------------------
// POST {API_BASE_URL}/messages/menssagens
// -----------------------------------------------
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    adicionarMensagemNaView(text, 'usuario');
    chatInput.value = '';

    try {
        const response = await fetch(`${API_BASE_URL}/messages/menssagens`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ conteudo: text }),
            credentials: 'include',
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        const data = await response.json();
        adicionarMensagemNaView(data.resposta, 'sistema');

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        adicionarMensagemNaView(error.message, 'erro');
    }
}

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// =============================================
// INICIALIZAÇÃO
// =============================================
window.addEventListener('load', () => {
    const token = localStorage.getItem('access_token');
    const email = localStorage.getItem('user_email');

    if (token && email) {
        atualizarUI(email);
    }
});
const micBtn = document.getElementById('voice');

if (window.SpeechSDK) {
    let recognizer;

    async function initRecognizer() {
        const response = await fetch(`${API_BASE_URL}/messages/speech-token`);
        const data = await response.json();
        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
            data.token,
            data.region
        );
        speechConfig.speechRecognitionLanguage = "pt-BR";

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        // resultados parciais
        recognizer.recognizing = (s, e) => {
            chatInput.value = e.result.text;
        };

        // resultados finais
        recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                chatInput.value = e.result.text;
            }
        };

        recognizer.sessionStopped = () => {
            micBtn.textContent = "🎤";
            recognizer.close();
            recognizer = undefined;
        };

        recognizer.canceled = () => {
            micBtn.textContent = "🎤";
            recognizer.close();
            recognizer = undefined;
        };
    }

    micBtn.addEventListener('click', async () => {
        if (!recognizer) {
            await initRecognizer();
            micBtn.textContent = "🎙️ Gravando...";
            recognizer.startContinuousRecognitionAsync();
        } else {
            recognizer.stopContinuousRecognitionAsync(() => {
                micBtn.textContent = "🎤";
                recognizer.close();
                recognizer = undefined;
            });
        }
    });
} else {
    console.warn("Azure Speech SDK não carregado.");
}
// 1. Função para limpar texto
function limparTextoParaAudio(texto) {
    const semTags = texto.replace(/<[^>]*>/g, '');
    const semMarkdown = semTags.replace(/[*_`#>~-]/g, '');
    return semMarkdown.trim();
}

// 2. Síntese de voz via Azure — busca o áudio como ArrayBuffer (WAV/PCM)
//    e reproduz via Web Audio API, contornando o bloqueio de MP3 no browser.
// ─────────────────────────────────────────────────────────────────────────────

// Estado global do player (apenas uma reprodução por vez)
const audioState = {
    ctx: null,          // AudioContext reutilizado entre reproduções
    source: null,       // BufferSourceNode ativo
    stopBtn: null,      // botão ⏹️ visível no DOM
    listenBtn: null,    // botão 🎧 da mensagem sendo reproduzida
    busy: false,        // true enquanto fetch+decode estão em andamento
};

// Obtém (ou cria) o AudioContext de forma compatível com Safari
function getAudioContext() {
    if (!audioState.ctx || audioState.ctx.state === 'closed') {
        audioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioState.ctx;
}

// Para qualquer reprodução em curso e limpa o estado global
function pararAudioAtual() {
    if (audioState.source) {
        try { audioState.source.stop(); } catch (_) {}
        audioState.source.disconnect();
        audioState.source = null;
    }
    if (audioState.stopBtn && audioState.stopBtn.isConnected) {
        audioState.stopBtn.remove();
    }
    audioState.stopBtn = null;

    if (audioState.listenBtn) {
        audioState.listenBtn.disabled = false;
        audioState.listenBtn.textContent = "🎧 Escutar";
        audioState.listenBtn = null;
    }
}

// Sintetiza `text` via REST do Azure e devolve um ArrayBuffer com o áudio WAV
async function sintetizarParaBuffer(text) {
    // Busca token de acesso
    const tokenRes = await fetch(`${API_BASE_URL}/messages/speech-token`);
    if (!tokenRes.ok) throw new Error(`Falha ao obter token: ${tokenRes.status}`);
    const { token, region } = await tokenRes.json();

    // Endpoint TTS REST — devolve áudio diretamente, sem SDK no browser
    const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
        <speak version="1.0" xml:lang="pt-BR">
            <voice name="pt-BR-FranciscaNeural">
                ${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
            </voice>
        </speak>`;

    const audioRes = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
            'Authorization'   : `Bearer ${token}`,
            // Riff-16khz-16bit-mono-pcm → WAV puro, suportado por todos os browsers
            'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
            'Content-Type'    : 'application/ssml+xml',
        },
        body: ssml,
    });

    if (!audioRes.ok) throw new Error(`TTS falhou: ${audioRes.status}`);
    return audioRes.arrayBuffer();
}

// 3. speakText — ponto de entrada chamado pelo botão 🎧 Escutar
async function speakText(text, parentDiv, listenBtn) {
    // Bloqueia cliques sobrepostos enquanto fetch/decode estão em andamento
    if (audioState.busy) return;
    audioState.busy = true;

    // Para qualquer áudio que esteja tocando agora
    pararAudioAtual();

    // Atualiza o botão desta mensagem para "carregando"
    if (listenBtn) {
        listenBtn.disabled = true;
        listenBtn.textContent = "⏳ Carregando...";
        audioState.listenBtn = listenBtn;
    }

    let buffer;
    try {
        const arrayBuffer = await sintetizarParaBuffer(text);
        const ctx = getAudioContext();
        // Resume o contexto (necessário após interação do usuário no Chrome)
        if (ctx.state === 'suspended') await ctx.resume();
        buffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.error("Erro ao sintetizar áudio:", err);
        if (listenBtn) {
            listenBtn.disabled = false;
            listenBtn.textContent = "🎧 Escutar";
            audioState.listenBtn = null;
        }
        audioState.busy = false;
        return;
    }

    // Libera o lock — a partir daqui a reprodução é síncrona (sem await)
    audioState.busy = false;

    // Cria o nó de reprodução
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    audioState.source = source;

    // Atualiza botão Escutar para "Reproduzindo"
    if (listenBtn) {
        listenBtn.textContent = "🔊 Reproduzindo...";
    }

    // Botão ⏹️ Parar — fica visível enquanto o áudio toca
    const stopBtn = document.createElement('button');
    stopBtn.textContent = "⏹️ Parar";
    stopBtn.className = "stop-btn";
    stopBtn.addEventListener('click', () => {
        pararAudioAtual();
        console.log("Áudio interrompido pelo usuário.");
    });
    parentDiv.appendChild(stopBtn);
    audioState.stopBtn = stopBtn;

    // Callback quando o áudio termina naturalmente
    source.onended = () => {
        // Só limpa se ainda for a source ativa (não foi parada manualmente)
        if (audioState.source === source) {
            pararAudioAtual();
            console.log("Áudio finalizado.");
        }
    };

    source.start(0);
}