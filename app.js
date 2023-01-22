const bodyParser = require('body-parser');
const { Sequelize, DataTypes, Model } = require('sequelize');
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const session = require('express-session');
let SequelizeStore = require("connect-session-sequelize")(session.Store);



async function main() {

    // connect to DB
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './main.db'
    });
    try {
        await sequelize.authenticate();
        console.log('Connection established')
    } catch (err) {
        console.error('Unable to connect', err)
        return
    }

    // Define Tables
    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING,
            allowNull: false

        },
        handle: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    const Post = sequelize.define('Post', {
        body: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    const Like = sequelize.define('Like', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        UserId: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: 'id'
            }
        },
        PostId: {
            type: DataTypes.INTEGER,
            references: {
                model: Post,
                key: 'id'
            }
        }
    }, { timestamps: false });
    // Define relations
    User.hasMany(Post, {
        foreignKey: 'UserId'
    });
    Post.belongsTo(User);
    User.belongsToMany(Post, { through: 'Like' });
    Post.belongsToMany(User, { through: 'Like' });
    Post.hasMany(Like)
    Like.belongsTo(Post)
    User.hasMany(Like)
    Like.belongsTo(User)
    // Sync all changes to DB
    await sequelize.sync();

    // Creates test User

    const [test, created] = await User.findOrCreate({
        where: { username: 'test' },
        defaults: {
            handle: 'Test',
            email: 'test@test',
            password: '123'
        }
    })


    // - Express        

    // setting up body parser

    let jsonParser = bodyParser.json();
    let urlencodedParser = bodyParser.urlencoded({ extended: false });

    // setting up express

    const app = express();
    app.use(express.static(__dirname + '/public'));
    app.set('view engine', 'ejs');

    // Initializing session

    let myStore = new SequelizeStore({
        db: sequelize,
    });
    app.use(
        session({
            secret: "keyboard cat",
            store: myStore,
            resave: false,
            proxy: true,
        })
    );

    myStore.sync();


    // Routes

    app.get('/', async (req, res) => {

        // Checking for valid sessions
        if (!req.session.user) return res.redirect('/login')


        data = await Post.findAll({
            attributes: ['id', 'body', 'createdAt'],
            include: [
                { model: User, attributes: ['id', 'username', 'handle'] },
                { model: Like },
            ]
        })

        userLikes = await Post.findAll({
            include: [
                {
                    model: Like,
                    where: {
                        UserId: req.session.user.id,
                    }
                }
            ]
        });
        let likeList = []
        await userLikes.forEach(like => {
            likeList.push(like.id);
        });

        return res.render('index', { data: data, likeList: likeList, user: req.session.user });
    });

    app.post('/', urlencodedParser, async (req, res) => {

        const post = Post.create({
            body: req.body.tweet,
            UserId: req.session.user.id
        })
        res.redirect('/')
    });

    app.post('/login', urlencodedParser, async (req, res) => {

        const user = await User.findOne({
            where: {
                username: req.body.username
            }
        })

        if (user === null) {
            return res.render('login', { error: 'Invalid Username or Password', form: req.body })
        };

        bcrypt.compare(req.body.password, user.password, function (err, result) {

            if (err) {
                return res.render('login', { error: err, form: req.body });
            }
            if (!result) {
                return res.render('login', { error: 'Invalid Username or Password', form: req.body })
            }


            req.session.regenerate(function (err) {
                if (err) return res.render('login', { error: err, form: req.body });
                req.session.user = { id: user.id, username: user.username };
                req.session.save(function (err) {
                    if (err) return res.render('login', { error: err, form: req.body });
                    console.log('session saved')
                    return res.redirect('/')
                })
            })
        });
    });

    app.get('/login', urlencodedParser, async (req, res) => {
        if (!req.session.user) return res.render('login')
        return res.redirect('/')

    })

    app.post('/delete/:postId', urlencodedParser, async (req, res) => {

        let post = await Post.findByPk(req.params.postId);
        if (post.UserId == req.session.user.id) post.destroy();
        res.redirect('/')
    });

    app.post('/like', jsonParser, async (req, res) => {
        const postId = req.body.postId;

        const [like, created] = await Like.findOrCreate({
            where: { PostId: postId, UserId: req.session.user.id },
            defaults: {
                PostId: postId,
                UserId: req.session.user.id
            }
        })

        if (!created) { like.destroy() }
        return res.send('{"message":"Done!"}')
    });
    app.get('/signup', urlencodedParser, function (req, res) {
        return res.render('signup')
    })

    app.post('/signup', urlencodedParser, async (req, res) => {

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

        // Check for valid inputs
        if (!emailRegex.test(req.body.email) && !passwordRegex.test(req.body.password) && req.body.password !== req.body.repeatPassword) {
            return res.render('signup', { error: 'Invalid Data!', form: req.body })
        };

        // Check for unique email
        const emailCheck = await User.findOne({ where: { email: req.body.email } });
        if (emailCheck !== null) { return res.render('signup', { error: 'Email Already Exists!', form: req.body }) }


        // Check for unique username, if username is unique creates user with hashed password
        let bcryptPassword = bcrypt.hashSync(req.body.password, 10)

        const [user, created] = await User.findOrCreate({
            where: { username: req.body.username },
            defaults: {
                handle: req.body.username,
                email: req.body.email,
                password: bcryptPassword
            }
        })
        if (!created) { return res.render('signup', { error: 'User Already Exists!', form: req.body }) }

        return res.redirect('/login')
    })

    app.get('/logout', function (req, res) {
        req.session.user = null
        req.session.save(function (err) {
            if (err) console.error(err)

            req.session.regenerate(function (err) {
                if (err) console.error(err)
                res.redirect('/')
            })
        })
    })

    app.listen(3000, function () {
        console.log('server started.')
    });

}

main()