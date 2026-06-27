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

    // Cria a div separada para o texto da conversa
    const textoDiv = document.createElement('div');
    textoDiv.className = 'mensagem-conteudo';
    textoDiv.innerHTML = conteudo;
    div.appendChild(textoDiv);

    if (tipo === 'sistema') {
        // Cria a div de rodapé para os botões de áudio
        const acoesDiv = document.createElement('div');
        acoesDiv.className = 'mensagem-acoes';

        const listenBtn = document.createElement('button');
        listenBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Escutar';
        listenBtn.className = "listen-btn";
        listenBtn.addEventListener('click', () => {
            const textoLimpo = limparTextoParaAudio(conteudo);
            speakText(textoLimpo, div, listenBtn); // passa o div e o próprio botão
        });

        acoesDiv.appendChild(listenBtn);
        div.appendChild(acoesDiv);
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// Funções para exibição e remoção do indicador de loading (Nicole digitando)
function exibirLoading() {
    if (document.getElementById('nicoleLoading')) return;

    const div = document.createElement('div');
    div.className = 'mensagem-sistema';
    div.id = 'nicoleLoading';

    const textoDiv = document.createElement('div');
    textoDiv.className = 'mensagem-conteudo loading-container';
    
    // Nota: O arquivo enviado possui extensão .jpg ("Nicole Chibi.png"). 
    // Caso use .png no ambiente, basta alterar a extensão abaixo.
    textoDiv.innerHTML = `
        <img src="images/Nicole Chibi.png" class="agente-loading-img" alt="Nicole digitando...">
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    div.appendChild(textoDiv);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removerLoading() {
    const loadingEl = document.getElementById('nicoleLoading');
    if (loadingEl) {
        loadingEl.remove();
    }
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
    div.innerHTML = mensagem; // Mudado para innerHTML para suportar o FontAwesome
}

function limparMensagemForm(id) {
    const div = document.getElementById(id);
    if (div) div.innerHTML = '';
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
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

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
        exibirMensagemForm(formLogin, 'loginError', '<i class="fa-solid fa-triangle-exclamation"></i> ' + error.message, '#dc3545');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
});

function atualizarUI(email) {
    if (email) {
        const nome = email.split('@')[0];
        const nomeFormatado = capitalize(nome);
        openLoginBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${nomeFormatado}`;
        logoutBtn.style.display = 'inline-block';
        openCadastroHeader.style.display = 'none';

        chatMessages.innerHTML = `
            <div class="mensagem-sistema">
                <div class="mensagem-conteudo">
                    Olá, ${nomeFormatado}! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a decolar nos recursos das Naves. Como posso ajudar você hoje?
                </div>
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
            <div class="mensagem-conteudo">
                Olá! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a encontrar informações sobre os recursos das Naves e esclarecer dúvidas sobre os serviços disponíveis. Como posso ajudar você hoje?
            </div>
        </div>`;
}

logoutBtn.addEventListener('click', fazerLogout);

// =============================================
// CADASTRO — Criar Usuário
// =============================================

openCadastroHeader.addEventListener('click', () => {
    abrirModal(cadastroModal);
});

openCadastroLink.addEventListener('click', (e) => {
    e.preventDefault();
    fecharModal(loginModal);
    abrirModal(cadastroModal);
});

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

const cadEmailInput = document.getElementById('cadEmail');
cadEmailInput.addEventListener('invalid', () => {
    cadEmailInput.setCustomValidity(
        'Digite um e-mail válido, sem acentos ou caracteres especiais (ex: joao@gmail.com).'
    );
});
cadEmailInput.addEventListener('input', () => {
    cadEmailInput.setCustomValidity('');
});

formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cadNome').value.trim();
    const email = document.getElementById('cadEmail').value.trim();
    const senha = document.getElementById('cadSenha').value;
    const nascimento = document.getElementById('cadNascimento').value;
    const submitBtn = formCadastro.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando conta...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/criar_usuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                nascimento: nascimento,
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
            if (Array.isArray(data.detail)) {
                console.error('Erro de validação (422):', data.detail);
                const msgErro = data.detail
                    .map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`)
                    .join(' | ');
                throw new Error(msgErro);
            }
            throw new Error(data.detail || `Erro ${response.status}`);
        }

        formCadastro.reset();
        exibirMensagemForm(formCadastro, 'cadastroError', '<i class="fa-solid fa-check"></i> Conta criada! Faça login.', '#28a745');

        setTimeout(() => {
            limparMensagemForm('cadastroError');
            fecharModal(cadastroModal);
            abrirModal(loginModal);
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }, 1200);

    } catch (error) {
        exibirMensagemForm(formCadastro, 'cadastroError', '<i class="fa-solid fa-triangle-exclamation"></i> ' + error.message, '#dc3545');
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

fundoChat.addEventListener('click', (e) => {
    if (e.target === fundoChat) {
        fecharModal(fundoChat);
        gatilhoAgente.style.display = 'block';
    }
});

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
            const email = localStorage.getItem('user_email');
            if (email) {
                const nome = email.split('@')[0];
                const nomeFormatado = capitalize(nome);
                adicionarMensagemNaView(
                    `Olá, ${nomeFormatado}! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a decolar nos recursos das Naves. Como posso ajudar você hoje?`
                );
            } else {
                adicionarMensagemNaView(
                    'Olá! Sou Nicole, sua assistente virtual de inteligência artificial. Estou aqui para ajudar você a encontrar informações sobre os recursos das Naves e esclarecer dúvidas sobre os serviços disponíveis. Como posso ajudar você hoje?'
                );
            }
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        adicionarMensagemNaView('<i class="fa-solid fa-xmark"></i> Não foi possível carregar o histórico.', 'erro');
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

    // 🚀 Ativa o indicador de loading enquanto aguarda a resposta
    exibirLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/messages/menssagens`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ conteudo: text }),
            credentials: 'include',
        });

        // 🛑 Remove o loading imediatamente após o retorno
        removerLoading();

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Erro ${response.status}`);
        }

        const data = await response.json();
        adicionarMensagemNaView(data.resposta, 'sistema');

    } catch (error) {
        // 🛑 Garante que o loading seja removido mesmo em caso de falha de conexão
        removerLoading();
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

        recognizer.recognizing = (s, e) => {
            chatInput.value = e.result.text;
        };

        recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                chatInput.value = e.result.text;
            }
        };

        recognizer.sessionStopped = () => {
            micBtn.classList.remove('gravando');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            recognizer.close();
            recognizer = undefined;
        };

        recognizer.canceled = () => {
            micBtn.classList.remove('gravando');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            recognizer.close();
            recognizer = undefined;
        };
    }

    micBtn.addEventListener('click', async () => {
        if (!recognizer) {
            await initRecognizer();
            micBtn.classList.add('gravando');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i> Gravando...';
            recognizer.startContinuousRecognitionAsync();
        } else {
            recognizer.stopContinuousRecognitionAsync(() => {
                micBtn.classList.remove('gravando');
                micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                recognizer.close();
                recognizer = undefined;
            });
        }
    });
} else {
    console.warn("Azure Speech SDK não carregado.");
}

function limparTextoParaAudio(texto) {
    const semTags = texto.replace(/<[^>]*>/g, '');
    const semMarkdown = semTags.replace(/[*_`#>~-]/g, '');
    return semMarkdown.trim();
}

// Estado global do player
const audioState = {
    ctx: null,          
    source: null,       
    stopBtn: null,      
    listenBtn: null,    
    busy: false,        
};

function getAudioContext() {
    if (!audioState.ctx || audioState.ctx.state === 'closed') {
        audioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioState.ctx;
}

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
        audioState.listenBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Escutar';
        audioState.listenBtn = null;
    }
}

async function sintetizarParaBuffer(text) {
    const tokenRes = await fetch(`${API_BASE_URL}/messages/speech-token`);
    if (!tokenRes.ok) throw new Error(`Falha ao obter token: ${tokenRes.status}`);
    const { token, region } = await tokenRes.json();

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
            'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
            'Content-Type'    : 'application/ssml+xml',
        },
        body: ssml,
    });

    if (!audioRes.ok) throw new Error(`TTS falhou: ${audioRes.status}`);
    return audioRes.arrayBuffer();
}

async function speakText(text, parentDiv, listenBtn) {
    if (audioState.busy) return;
    audioState.busy = true;

    pararAudioAtual();

    if (listenBtn) {
        listenBtn.disabled = true;
        listenBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
        audioState.listenBtn = listenBtn;
    }

    let buffer;
    try {
        const arrayBuffer = await sintetizarParaBuffer(text);
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        buffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.error("Erro ao sintetizar áudio:", err);
        if (listenBtn) {
            listenBtn.disabled = false;
            listenBtn.innerHTML = '<i class="fa-solid fa-headphones"></i> Escutar';
            audioState.listenBtn = null;
        }
        audioState.busy = false;
        return;
    }

    audioState.busy = false;

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    audioState.source = source;

    if (listenBtn) {
        listenBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Reproduzindo...';
    }

    const stopBtn = document.createElement('button');
    stopBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Parar';
    stopBtn.className = "stop-btn";
    stopBtn.addEventListener('click', () => {
        pararAudioAtual();
        console.log("Áudio interrompido pelo usuário.");
    });
    
    const acoesDiv = parentDiv.querySelector('.mensagem-acoes');
    if (acoesDiv) {
        acoesDiv.appendChild(stopBtn);
    } else {
        parentDiv.appendChild(stopBtn);
    }
    audioState.stopBtn = stopBtn;

    source.onended = () => {
        if (audioState.source === source) {
            pararAudioAtual();
            console.log("Áudio finalizado.");
        }
    };

    source.start(0);
}