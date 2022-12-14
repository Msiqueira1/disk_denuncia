const express = require('express');
const router = express.Router();
const multer = require('multer')
const path = require('path');
const helpers = require('../lib/helpers');
const fs = require('fs');
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');

router.get('/add', (req, res) => {
    res.render('links/add');
});

//configuração upload evidencias (anexo)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/public/images')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-disk_denuncia-${file.originalname.replaceAll(' ','_')}`);
    },
});
const upload = multer({
    storage: storage,
    //fileFilter: imageFilter,
    limits: {
        fileSize: 1024 * 1024 * 5
    }
})

//Funcionalidade Admin
//criar novo user gestor
router.post('/novo_usuario', async (req, res) => {
    res.redirect('/users');
});

// Cadastrar Denúncias
router.get('/cadastros/cadastro_denuncia', (req, res) => {
    res.render('links/cadastros/cadastro_denuncia');
})

router.post('/cadastros/cadastro_denuncia', isLoggedIn, async (req, res) => { /* Rota Post para tabela tipo denúncia (inserção no banco)*/
    const { tipologia } = req.body;
    const { grau } = req.body;
    const DT_CAD = new Date();
    const newDenuncia = {
        tipologia,
        grau,
        DT_CAD
    };
    await pool.query('INSERT INTO tb_denuncia set ?', [newDenuncia]);
    req.flash('success', 'Tipo de denúncia cadastrada com Sucesso!');
    res.redirect('/links/cadastros/cadastro_denuncia');
});

//consultar denuncias cadastradas
router.get('/consultas/consulta_denuncia', isLoggedIn, async (req, res) => {
    const denuncia = await pool.query('SELECT (ID_DENUNCIA), (TIPOLOGIA), (GRAU), DATE_FORMAT(DT_CAD, "%d/%m/%Y") AS DT_CAD FROM tb_denuncia');
    res.render('links/consultas/consulta_denuncia', { denuncia });
});

//Cadastrar nova localidade
router.get('/cadastros/cadastro_localidade', (req, res) => {
    res.render('links/cadastros/cadastro_localidade');
});

router.post('/cadastros/cadastro_localidade', isLoggedIn, async (req, res) => { /*Rota Post para tabela localidade (inserção no banco)*/
    const { localidade } = req.body;
    const DT_CAD = new Date();
    const newLocalidade = {
        localidade,
        DT_CAD
    };
    await pool.query('INSERT INTO tb_localidade set ?', [newLocalidade]);
    req.flash('success', 'Localidade cadastrada com Sucesso!');
    res.redirect('/links/cadastros/cadastro_localidade');
});

//consultar localidades cadastrados
router.get('/consultas/consulta_localidade', isLoggedIn, async (req, res) => {
    const localidade = await pool.query('SELECT (ID_LOCALIDADE), (LOCALIDADE), DATE_FORMAT(DT_CAD, "%d/%m/%Y") AS DT_CAD FROM tb_localidade');
    res.render('links/consultas/consulta_localidade', { localidade });
});

//Cadastrar Usuários
router.get('/cadastros/cadastro_usuarios', (req, res) => {
    res.render('links/cadastros/cadastro_usuarios');
});

router.post('/cadastros/cadastro_usuarios', isLoggedIn, async (req, res) => { /* Rota Post para tabela tipo Usuário (inserção no banco)*/
    const { username } = req.body;
    const { password } = req.body;
    const { fullname } = req.body;
    const ADMINISTRADOR = null;
    const TIPO_PROTOCOLO = null;
    const TIPO_DEN = 1;
    const newUsuario = {
        username,
        password,
        fullname,
        ADMINISTRADOR,
        TIPO_DEN,
        TIPO_PROTOCOLO
    };
    newUsuario.password = await helpers.encryptPassword(password);
    await pool.query('INSERT INTO users set ?', [newUsuario]);
    req.flash('success', 'Gestor cadastrado com Sucesso!');
    res.redirect('/links/cadastros/cadastro_usuarios');
});

//consultar usuarios cadastrados
router.get('/consultas/consulta_usuarios', isLoggedIn, async (req, res) => {
    const usuario = await pool.query('SELECT (id), (fullname), (username) FROM users WHERE TIPO_DEN=1');
    res.render('links/consultas/consulta_usuarios', { usuario });
});

//Funcionalidades Gestor/ Denunciante
//consultar relados cadastrados (gestor/ denunciante)
router.get('/consultas/consulta_relato', isLoggedIn, async (req, res) => {
    const idlogin = req.user.id
    const gestor = await pool.query('SELECT ID_RELATO,r.NOME,r.EMAIL,r.TELEFONE, DATE_FORMAT(r.DT_CADASTRO,"%d/%m/%Y") AS DT_CADASTRO, ' +
        'DATE_FORMAT(r.DT_RELATO,"%d/%m/%Y") AS DT_RELATO,r.STATUS,r.PROTOCOLO, ' +
        'r.VIVENCIOU,TEMPO_OCOR, PESSOA_ENVOLVIDA,CARGO_ENVOLVIDO,RELACAO_EMPREGADO, ' +
        'EVIDENCIA,r.DESC_RELATO, l.LOCALIDADE, d.TIPOLOGIA ' +
        'FROM tb_relato r ' +
        'inner join tb_denuncia d on (d.ID_DENUNCIA=r.ID_DENUNCIA) ' +
        'inner join tb_localidade l on (l.ID_LOCALIDADE=r.ID_LOCALIDADE);');

    const denunciante = await pool.query('SELECT ID_RELATO,r.NOME,r.EMAIL,r.TELEFONE, DATE_FORMAT(r.DT_CADASTRO,"%d/%m/%Y") AS DT_CADASTRO, ' +
        'DATE_FORMAT(r.DT_RELATO,"%d/%m/%Y") AS DT_RELATO,r.STATUS,r.PROTOCOLO, ' +
        'r.VIVENCIOU,TEMPO_OCOR, PESSOA_ENVOLVIDA,CARGO_ENVOLVIDO,RELACAO_EMPREGADO, ' +
        'EVIDENCIA,r.DESC_RELATO, l.LOCALIDADE, d.TIPOLOGIA ' +
        'FROM tb_relato r ' +
        'inner join tb_denuncia d on (d.ID_DENUNCIA=r.ID_DENUNCIA) ' +
        'inner join tb_localidade l on (l.ID_LOCALIDADE=r.ID_LOCALIDADE) ' +
        'inner join users u on (u.username = r.PROTOCOLO) ' +
        'where u.id = ?', [idlogin]);

    res.render('links/consultas/consulta_relato', { gestor, denunciante });
});

//exibir detalhes denuncia 
router.get('/consultas/denuncia/:texto?', isLoggedIn, async (req, res) => {
    const idlogin = req.user.CODLOGIN
    const params = req.params.texto;
    const contrar = params

    const gestor = await pool.query('SELECT distinct r.ID_RELATO,r.NOME,r.EMAIL,r.TELEFONE, ' +
        'DATE_FORMAT(r.DT_RELATO,"%d/%m/%Y") AS DT_RELATO,r.STATUS,r.PROTOCOLO, ' +
        'r.VIVENCIOU,TEMPO_OCOR, r.PESSOA_ENVOLVIDA,r.CARGO_ENVOLVIDO,r.RELACAO_EMPREGADO, ' +
        'EVIDENCIA,r.DESC_RELATO, l.LOCALIDADE, d.TIPOLOGIA ' +
        'FROM tb_relato r ' +
        'inner join tb_denuncia d on (d.ID_DENUNCIA=r.ID_DENUNCIA) ' +
        'inner join tb_localidade l on (l.ID_LOCALIDADE=r.ID_LOCALIDADE) ' +
        'left join tb_acompanhamento a on (a.ID_RELATO = r.ID_RELATO) ' +
        'WHERE r.ID_RELATO = ?', [contrar]);

    const acomp = await pool.query('SELECT distinct r.ID_RELATO ' +
        'FROM tb_relato r ' +
        'inner join tb_denuncia d on (d.ID_DENUNCIA=r.ID_DENUNCIA) ' +
        'inner join tb_localidade l on (l.ID_LOCALIDADE=r.ID_LOCALIDADE) ' +
        'left join tb_acompanhamento a on (a.ID_RELATO = r.ID_RELATO) ' +
        'WHERE r.ID_RELATO = ?', [contrar]);

    const acomp1 = await pool.query('SELECT distinct r.ID_RELATO, ' +
        'a.DESCRICAO AS ACOMPANHAMENTO, DATE_FORMAT(a.DT_CADASTRO,"%d/%m/%Y")  AS DT_ACOMP ' +
        'FROM tb_relato r ' +
        'inner join tb_denuncia d on (d.ID_DENUNCIA=r.ID_DENUNCIA) ' +
        'inner join tb_localidade l on (l.ID_LOCALIDADE=r.ID_LOCALIDADE) ' +
        'left join tb_acompanhamento a on (a.ID_RELATO = r.ID_RELATO) ' +
        'WHERE r.ID_RELATO = ?', [contrar]);

    const anexo = await pool.query('SELECT distinct r.ID_RELATO, f.image ' +
        'FROM tb_relato r ' +
        'left join users_file f on (f.ID_RELATO = r.ID_RELATO) ' +
        'WHERE r.ID_RELATO = ?', [contrar]);

    res.render('links/consultas/denuncia', { gestor, acomp, acomp1, anexo });
});

//Cadastrar acompanhamento relatos
router.post('/consultas/acompanhamento', isLoggedIn, async (req, res) => {

    const ID_RELATO = req.body.acompanhamento;
    let DESCRICAO = req.body.desc_acompanhamento;
    const DT_CADASTRO = new Date();
    const encerrado = req.body.encerrado
    let STATUS = ''

    if (encerrado === 'on') {
        STATUS = "Finalizado";
        DESCRICAO = "Finalizado Pelo Analista";
    } else {
        STATUS = "Em Análise";
    }

    if (DESCRICAO === '') {
        res.redirect('/links/consultas/consulta_relato')
    } else {
        const newAcomp = {
            ID_RELATO,
            DESCRICAO,
            DT_CADASTRO
        };
        await pool.query('INSERT INTO tb_acompanhamento set ?', [newAcomp]);

        await pool.query('UPDATE tb_relato set STATUS= ? WHERE ID_RELATO = ?', [STATUS, ID_RELATO]);

        req.flash('success', 'Sua denúncia foi finalizada.')
        res.redirect('/links/consultas/consulta_relato')
    }
});

router.get('/cadastros/upload', async (req, res) => {
    const localidade = await pool.query('SELECT ID_LOCALIDADE, LOCALIDADE FROM tb_localidade');
    const denuncia = await pool.query('SELECT ID_DENUNCIA, TIPOLOGIA FROM tb_denuncia');
    const lastid = await pool.query('SELECT (ID_RELATO + 1) as ID_RELATO FROM tb_relato order by ID_RELATO desc LIMIT 1 ;');

    res.render('links/cadastros/upload', { localidade, denuncia, lastid });
});

router.post('/cadastros/upload', upload.single('image'), async (req, res) => {

    const { nome } = req.body;
    const {id_relato} = req.body;
    const { email } = req.body;
    const { telefone } = req.body;
    const { vivenciou } = req.body;
    const { tempo_ocor } = req.body;
    const { desc_relato } = req.body;
    const { pessoa_envolvida, } = req.body;
    const { cargo_envolvido } = req.body;
    const { evidencia } = req.body;
    const { relacao_empregado } = req.body;
    const { dt_relato } = req.body;
    const { id_denuncia } = req.body;
    const { id_localidade } = req.body;
    const DT_CADASTRO = new Date();
    const STATUS = "Aberto";

    console.log('id_relato')
    console.log(id_relato)

    //gerar protocolo denunciante
    const generateRandomString = (num) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result1 = ' ';
        const charactersLength = characters.length;
        for (let i = 0; i < num; i++) {
            result1 += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result1;
    }

    const displayRandomString = () => {
        let randomStringContainer = document.getElementById('random_string');
        randomStringContainer.innerHTML = generateRandomString(8);
    }

    let PROTOCOLO1 = generateRandomString(8);
    let PROTOCOLO = PROTOCOLO1.trim()

    const newRelato = {
        id_relato,
        nome,
        email,
        telefone,
        vivenciou,
        tempo_ocor,
        desc_relato,
        pessoa_envolvida,
        cargo_envolvido,
        evidencia,
        relacao_empregado,
        dt_relato,
        id_denuncia,
        id_localidade,
        DT_CADASTRO,
        STATUS,
        PROTOCOLO

    };
    await pool.query('INSERT INTO tb_relato set ?', [newRelato]);

    //inserir protocolo (login e senha) tabela user 
    const username = PROTOCOLO;
    const password = PROTOCOLO;
    const TIPO_PROTOCOLO = 1;
    let newUser = {
        username,
        password,
        TIPO_PROTOCOLO
    };
    newUser.password = await helpers.encryptPassword(password);

    const result = await pool.query('INSERT INTO users SET ? ', newUser);

    //anexar arquivo denunciante
    console.log('req.files');
    console.log(req.file.filename);

    const image = '/images/' + req.file.filename;

    console.log('rota');
    console.log(image);

    const imagem = {
        id_relato,
        image
    };

    await pool.query('INSERT INTO users_file set ?', [imagem]);

    newUser.id = result.insertId; req.flash('success', 'Segue o seu protocolo para acompanhar o status denuncia, COPIE ESTE NÚMERO: ' + PROTOCOLO);
    res.redirect('/protocolo');
});

//cadastrar novo relato 
router.get('/cadastros/cadastro_relato', async (req, res) => {
    const localidade = await pool.query('SELECT ID_LOCALIDADE, LOCALIDADE FROM tb_localidade');
    const denuncia = await pool.query('SELECT ID_DENUNCIA, TIPOLOGIA FROM tb_denuncia');
    res.render('links/cadastros/cadastro_relato', { localidade, denuncia });
})

router.post('/cadastros/cadastro_relato', async (req, res) => {

    const { nome } = req.body;
    const { email } = req.body;
    const { telefone } = req.body;
    const { vivenciou } = req.body;
    const { tempo_ocor } = req.body;
    const { desc_relato } = req.body;
    const { pessoa_envolvida, } = req.body;
    const { cargo_envolvido } = req.body;
    const { evidencia } = req.body;
    const { relacao_empregado } = req.body;
    const { dt_relato } = req.body;
    const { id_denuncia } = req.body;
    const { id_localidade } = req.body;
    const DT_CADASTRO = new Date();
    const STATUS = "Aberto";

    const generateRandomString = (num) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result1 = ' ';
        const charactersLength = characters.length;
        for (let i = 0; i < num; i++) {
            result1 += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result1;
    }

    const displayRandomString = () => {
        let randomStringContainer = document.getElementById('random_string');
        randomStringContainer.innerHTML = generateRandomString(8);
    }

    let PROTOCOLO1 = generateRandomString(8);
    let PROTOCOLO = PROTOCOLO1.trim()

    const newRelato = {
        nome,
        email,
        telefone,
        vivenciou,
        tempo_ocor,
        desc_relato,
        pessoa_envolvida,
        cargo_envolvido,
        relacao_empregado,
        dt_relato,
        id_denuncia,
        id_localidade,
        DT_CADASTRO,
        STATUS,
        PROTOCOLO

    };
    await pool.query('INSERT INTO tb_relato set ?', [newRelato]);

    //inserir protocolo (login e senha) tabela user 
    const username = PROTOCOLO;
    const password = PROTOCOLO;
    const TIPO_PROTOCOLO = 1;
    let newUser = {
        username,
        password,
        TIPO_PROTOCOLO
    };
    newUser.password = await helpers.encryptPassword(password);
    // Saving in the Database
    const result = await pool.query('INSERT INTO users SET ? ', newUser);

    newUser.id = result.insertId; req.flash('success', 'Segue o seu protocolo para acompanhar o status denuncia, COPIE ESTE NÚMERO: ' + PROTOCOLO);
    res.redirect('/protocolo');
});

router.get('/delete/:id', async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM links WHERE ID = ?', [id]);
    req.flash('success', 'Link Removed Successfully');
    res.redirect('/links');
});

router.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const links = await pool.query('SELECT * FROM links WHERE id = ?', [id]);
    console.log(links);
    res.render('links/edit', { link: links[0] });
});

router.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, url } = req.body;
    const newLink = {
        title,
        description,
        url
    };
    await pool.query('UPDATE links set ? WHERE id = ?', [newLink, id]);
    req.flash('success', 'Link Updated Successfully');
    res.redirect('/links');
});

module.exports = router;