import express from "express"
import cors from "cors"
import mysql2 from "mysql2/promise"
import bcrypt from "bcrypt"

const { DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD } = process.env;

const database = mysql2.createPool({
    host: DB_HOST,
    database: DB_DATABASE,
    user: DB_USER,
    password: DB_PASSWORD,
    connectionLimit: 10
})

const app = express()
const port = 3333

app.use(cors())
app.use(express.json())

app.get("/", async (request, response) => {
    try {
        const selectCommand = "SELECT name, email FROM tecteen_edutec";
        const [users] = await database.query(selectCommand);
        response.json(users);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: "Erro ao buscar usuários." })
    }
})
// index.js (Rota POST /login - Onde o erro pode ocorrer)

// index.js (Rota POST /login - COMPLETA)

app.post("/login", async (request, response) => {
    // 1. Recebe os dados do frontend
    const { email, password } = request.body; 

    if (!email || !password) {
        return response.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    try {
        // 2. Busca o usuário pelo email
        const selectCommand = "SELECT senha, name FROM tecteen_edutec WHERE email = ?";
        const [users] = await database.query(selectCommand, [email]);

        // 3. Verifica se o usuário existe
        if (users.length === 0) {
            // Mensagem genérica para segurança
            return response.status(401).json({ message: "E-mail ou senha inválidos." });
        }

        const user = users[0];
        const senha_hash = user.senha; // A senha hash armazenada no BD
        const userName = user.name; // Nome para enviar na resposta

        // --- DEBUG CRÍTICO ---
        console.log("LOGIN TENTATIVA:", email);
        console.log("Hash do BD:", senha_hash);
        // ---------------------

        // 4. Compara a senha fornecida com o hash
        const passwordMatch = await bcrypt.compare(password, senha_hash);

        // --- DEBUG CRÍTICO ---
        console.log("Resultado da comparação:", passwordMatch);
        // ---------------------


        if (passwordMatch) {
            // 5. Login Bem-Sucedido
            // Em um projeto real, você implementaria o JWT aqui. 

            return response.status(200).json({ 
                message: "Login bem-sucedido!",
                userEmail: email,
                userName: userName // Envia o nome para o frontend
            });
        } else {
            // 6. Senha Incorreta
            return response.status(401).json({ message: "E-mail ou senha inválidos." });
        }

    } catch (error) {
        console.error("Erro interno do servidor durante o login:", error);
        response.status(500).json({ message: "Erro interno do servidor durante o login." });
    }
});

app.post("/cadastrar", async (request, response) => {
    // A desestruturação atual está correta:
    const { text, name, email, password } = request.body; 

    if (!text || !name || !email || !password) {
        return response.status(400).json({ message: "Todos os campos são obrigatórios." });
    }
    
    try {
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(password, saltRounds);

        // O comando de inserção:
        const insertCommand = `
            INSERT INTO tecteen_edutec (text, name, email, senha)
            VALUES (?, ?, ?, ?)
        `;
        const values = [text, name, email, senha_hash]; 

        await database.query(insertCommand, values);

        console.log(`✅ NOVO CADASTRO: Sucesso para o e-mail: ${email}`);
        
        response.status(201).json({ message: "Usuário cadastrado com sucesso!" });

    } catch (error) {
        // ESSA É A PARTE CRÍTICA QUE ESTAVA FALTANDO:
        console.error("❌ ERRO COMPLETO DO BANCO DE DADOS (CÓDIGO SQL):", error.code);
        console.error("❌ MENSAGEM DO ERRO SQL:", error.message);
        
        // Se este erro for de email/nickname já cadastrado:
        if (error.code === 'ER_DUP_ENTRY') {
            return response.status(409).json({ message: "E-mail ou Nickname já cadastrado." });
        }
        
        // Se for qualquer outro erro (conexão, tabela, coluna, etc.)
        response.status(500).json({ message: "Erro interno: Falha ao inserir no banco." });
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}!`);
})