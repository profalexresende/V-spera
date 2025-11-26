// =========================================================
// 🌙 Servidor Node.js com suporte a Login, Registro e MongoDB
// =========================================================

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
const path = require("path");
const methodOverride = require("method-override");

const app = express();
const porta = 3000;

// =========================================================
// ⚙️ CONFIGURAÇÕES BÁSICAS
// =========================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Sessões para armazenar usuários logados
app.use(
  session({
    secret: "chave-super-secreta", // Altere se quiser
    resave: false,
    saveUninitialized: true,
  })
);

// =========================================================
// 🗂️ CONEXÃO COM O MONGODB
// =========================================================

// ⚠️ COLOQUE AQUI A SUA CHAVE DO MONGODB
// Exemplo local: 'mongodb://127.0.0.1:27017'
// Exemplo Atlas: 'mongodb+srv://usuario:senha@cluster.mongodb.net/?retryWrites=true&w=majority'
const urlMongo = "mongodb+srv://prof_alexresende:futurefest2025@futurefest2025.5ljzwdj.mongodb.net/?appName=FutureFest2025"; // 🔧 <- ALTERE AQUI SE PRECISAR
const nomeBanco = "MY_LIFE_APP";

// =========================================================
// 🧩 CONFIGURAÇÃO DE PASTA ESTÁTICA (HTMLs, CSS, Imagens)
// =========================================================
app.use(express.static(path.join(__dirname, "public")));



// =========================================================
// 🏠 ROTAS DE PÁGINAS
// =========================================================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "home.html")));
app.get("/diario", (req, res) => res.sendFile(path.join(__dirname, "views", "diario.html")));
app.get("/artigos", (req, res) => res.sendFile(path.join(__dirname, "views", "artigos.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/registro", (req, res) => res.sendFile(path.join(__dirname, "views", "registro.html")));

// =========================================================
// 🔐 FUNÇÃO PARA PROTEGER ROTAS LOGADAS
// =========================================================
function protegerRota(req, res, next) {
  if (req.session.usuario) return next();
  res.redirect("/login");
}

// =========================================================
// 👤 REGISTRO DE NOVO USUÁRIO (COM DEBUG DETALHADO)
// =========================================================
app.post("/registro", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  const timestamp = () => new Date().toISOString();

  console.log(`\n[${timestamp()}] 🚀 Nova tentativa de REGISTRO`);

  try {
    await cliente.connect();
    console.log(`[${timestamp()}] ✅ Conectado ao MongoDB: ${urlMongo}`);

    const db = cliente.db(nomeBanco);
    const usuarios = db.collection("usuarios");

    // --- DADOS DO FORMULÁRIO ---
    const { nome, email, senha } = req.body;
    console.log(`[${timestamp()}] 📩 Dados recebidos:`);
    console.log(`    Nome: ${nome}`);
    console.log(`    E-mail: ${email}`);
    console.log(`    Senha: ${senha ? '*** (oculta)' : 'vazia!'}`);

    if (!nome || !email || !senha) {
      console.log(`[${timestamp()}] ⚠️ Campos obrigatórios faltando!`);
      return res.send("<script>alert('Preencha todos os campos!'); window.history.back();</script>");
    }

    // --- VERIFICA E-MAIL DUPLICADO ---
    console.log(`[${timestamp()}] 🔍 Buscando e-mail no banco...`);
    const emailExistente = await usuarios.findOne({ email });
    if (emailExistente) {
      console.log(`[${timestamp()}] ❌ E-mail já cadastrado: ${email}`);
      return res.send("<script>alert('E-mail já cadastrado!'); window.location.href='/registro';</script>");
    } else {
      console.log(`[${timestamp()}] ✅ E-mail disponível: ${email}`);
    }

    // --- CRIPTOGRAFIA DA SENHA ---
    console.log(`[${timestamp()}] 🔐 Gerando hash da senha...`);
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    console.log(`[${timestamp()}] ✅ Hash gerado (10 rounds)`);

    // --- DADOS QUE SERÃO INSERIDOS ---
    const usuarioParaInserir = { nome, email, senha: senhaCriptografada };
    console.log(`[${timestamp()}] 📥 Inserindo no MongoDB:`);
    console.dir(usuarioParaInserir, { depth: null, colors: true });

    // --- INSERÇÃO ---
    const resultado = await usuarios.insertOne(usuarioParaInserir);
    console.log(`[${timestamp()}] 🎉 Usuário inserido com sucesso!`);
    console.log(`    ID gerado: ${resultado.insertedId}`);

    // --- RESPOSTA AO USUÁRIO ---
    res.send("<script>alert('Registro realizado com sucesso! Faça login.'); window.location.href='/login';</script>");
    console.log(`[${timestamp()}] ✅ Redirecionado para /login\n`);

  } catch (erro) {
    console.error(`[${timestamp()}] 💥 ERRO no registro:`);
    console.error(erro);
    res.status(500).send("Erro interno ao registrar usuário.");
  } finally {
    await cliente.close();
    console.log(`[${timestamp()}] 🔌 Conexão com MongoDB fechada\n`);
  }
});

// =========================================================
// 🔑 LOGIN DE USUÁRIO
// =========================================================
app.post("/login", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  try {
    await cliente.connect();
    const db = cliente.db(nomeBanco);
    const usuarios = db.collection("usuarios");

    const { email, senha } = req.body;
    const usuario = await usuarios.findOne({ email });

    if (usuario && (await bcrypt.compare(senha, usuario.senha))) {
      req.session.usuario = usuario.nome;
      res.redirect("/bemvindo");
    } else {
      res.send("<script>alert('E-mail ou senha incorretos!'); window.location.href='/login';</script>");
    }
  } catch (erro) {
    console.error("Erro ao logar:", erro);
    res.status(500).send("Erro ao realizar login.");
  } finally {
    await cliente.close();
  }
});

// =========================================================
// 🧠 PÁGINAS PROTEGIDAS (apenas usuários logados)
// =========================================================
app.get("/bemvindo", protegerRota, (req, res) => {
  res.send(`
    <script>
      alert("Login efetuado com sucesso! Bem-vindo(a), ${req.session.usuario}!");
      window.location.href = "/";
    </script>
  `);
});

// =========================================================
// 🚪 LOGOUT
// =========================================================
app.get("/sair", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Erro ao sair!");
    res.redirect("/login");
  });
});

// =========================================================
// 📬 CONTATO / FORMULÁRIO (OPCIONAL)
// =========================================================
app.post("/contato", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  try {
    await cliente.connect();
    const db = cliente.db(nomeBanco);
    const contatos = db.collection("contatos");

    const novo = {
      nome: req.body.nome,
      email: req.body.email,
      mensagem: req.body.mensagem,
      data: new Date(),
    };

    await contatos.insertOne(novo);
    res.send("<script>alert('Mensagem enviada com sucesso!'); window.location.href='/';</script>");
  } catch (erro) {
    console.error("Erro ao enviar formulário:", erro);
    res.status(500).send("Erro ao enviar formulário.");
  } finally {
    await cliente.close();
  }
});

// =========================================================
// 📔 DIÁRIO - SALVAR REGISTRO
// =========================================================
app.post("/api/diario", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  const timestamp = () => new Date().toISOString();

  try {
    await cliente.connect();
    const db = cliente.db(nomeBanco);
    const diario = db.collection("diario");

    const { data, emoji, titulo, descricao } = req.body;

    if (!data || !emoji || !titulo) {
      return res.status(400).json({ erro: "Campos obrigatórios: data, emoji e título" });
    }

    const registro = {
      data: new Date(data),
      emoji: emoji,
      titulo: titulo,
      descricao: descricao || "",
      dataCriacao: new Date(),
    };

    const resultado = await diario.insertOne(registro);
    console.log(`[${timestamp()}] 📔 Registro de diário salvo: ${resultado.insertedId}`);

    res.json({ sucesso: true, id: resultado.insertedId, registro: registro });
  } catch (erro) {
    console.error(`[${timestamp()}] 💥 ERRO ao salvar registro do diário:`, erro);
    res.status(500).json({ erro: "Erro ao salvar registro do diário." });
  } finally {
    await cliente.close();
  }
});

// =========================================================
// 📔 DIÁRIO - BUSCAR REGISTROS
// =========================================================
app.get("/api/diario", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  const timestamp = () => new Date().toISOString();

  try {
    await cliente.connect();
    const db = cliente.db(nomeBanco);
    const diario = db.collection("diario");

    const registros = await diario.find({}).sort({ data: -1 }).toArray();
    console.log(`[${timestamp()}] 📔 Buscando registros do diário: ${registros.length} encontrados`);

    // Converter ObjectId para string e data para formato legível
    const registrosFormatados = registros.map(reg => ({
      id: reg._id.toString(),
      data: reg.data.toISOString().split('T')[0],
      emoji: reg.emoji,
      titulo: reg.titulo,
      descricao: reg.descricao,
      dataCriacao: reg.dataCriacao
    }));

    res.json({ sucesso: true, registros: registrosFormatados });
  } catch (erro) {
    console.error(`[${timestamp()}] 💥 ERRO ao buscar registros do diário:`, erro);
    res.status(500).json({ erro: "Erro ao buscar registros do diário." });
  } finally {
    await cliente.close();
  }
});

// =========================================================
// 🚀 INICIAR SERVIDOR
// =========================================================
app.listen(porta, () => {
  console.log(` Servidor rodando em http://localhost:${porta}`);

 
});
