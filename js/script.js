// =============================================
// CONFIGURAÇÃO
// =============================================

// ⚠️ O front roda no Live Server (porta 5500) e o backend FastAPI
// roda em outra porta (8000). Por isso TODA chamada precisa da URL
// completa do backend — caminhos relativos ("/auth/login-form")
// vão sempre bater no próprio Live Server, que não tem essas rotas.
const API_BASE_URL = 'https://api-backend-f9exb6cbghh5d3e3.westus2-01.azurewebsites.net';

// =============================================
// UTILITÁRIOS
// =============================================

function getAuthHeaders(isJson = true) {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (isJson) headers['Content-Type'] = 'application/json';
    if (token)  headers['Authorization'] = `Bearer ${token}`;
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
        erro:    'mensagem-erro',
    };
    div.className = classeMap[tipo] || 'mensagem-sistema';
    div.textContent = conteudo;
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

const openLoginBtn       = document.getElementById('openLogin');
const closeLoginBtn      = document.getElementById('closeLogin');
const loginModal         = document.getElementById('loginModal');
const formLogin          = document.getElementById('formLogin');
const logoutBtn          = document.getElementById('logoutBtn');
const openCadastroHeader = document.getElementById('openCadastroHeader');

const openCadastroLink  = document.getElementById('openCadastro');
const voltarLoginLink   = document.getElementById('voltarLogin');
const closeCadastroBtn  = document.getElementById('closeCadastro');
const cadastroModal     = document.getElementById('cadastroModal');
const formCadastro      = document.getElementById('formCadastro');

// Chat da Agente Nicole
const gatilhoAgente   = document.getElementById('gatilhoAgente');
const fundoChat       = document.getElementById('fundoChat');
const fecharChatBtn   = document.getElementById('fecharChatBtn');
const chatInput       = document.getElementById('chatInput');
const sendChatBtn     = document.getElementById('sendChat');
const chatMessages    = document.getElementById('chatMessages');

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

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = formLogin.querySelector('button[type="submit"]');

    submitBtn.disabled    = true;
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
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Entrar';
    }
});

function atualizarUI(email) {
    if (email) {
        const nome = email.split('@')[0];
        openLoginBtn.textContent      = `👤 ${nome}`;
        logoutBtn.style.display       = 'inline-block';
        // ✅ CORRIGIDO: esconde "Cadastre-se" enquanto o usuário está logado —
        // antes ele continuava visível mesmo após o login.
        openCadastroHeader.style.display = 'none';
    } else {
        openLoginBtn.textContent      = 'Área do usuário';
        logoutBtn.style.display       = 'none';
        openCadastroHeader.style.display = 'inline-block';
    }
}

function fazerLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    atualizarUI(null);
    chatMessages.innerHTML = `
        <div class="mensagem-sistema">
            Olá! Sou Nicole, uma agente de inteligência artificial, que atuarei como a astronauta
            que posso te auxiliar a decolar nos recursos das Naves. O que posso te ajudar hoje?
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

    const nome       = document.getElementById('cadNome').value.trim();
    const email      = document.getElementById('cadEmail').value.trim();
    const senha      = document.getElementById('cadSenha').value;
    const nascimento = document.getElementById('cadNascimento').value; // formato YYYY-MM-DD
    const submitBtn  = formCadastro.querySelector('button[type="submit"]');

    submitBtn.disabled    = true;
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
        submitBtn.disabled    = false;
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
            adicionarMensagemNaView(
                'Olá! Sou Nicole, uma agente de inteligência artificial, que atuarei como a astronauta ' +
                'que posso te auxiliar a decolar nos recursos das Naves. O que posso te ajudar hoje?',
                'sistema'
            );
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