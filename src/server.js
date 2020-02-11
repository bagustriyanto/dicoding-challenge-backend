// Patches
const { inject, errorHandler } = require("express-custom-error")
inject() // Patch express in order to use async / await syntax

// Require Dependencies

const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")
const jwt = require("./util/jwt")
const path = require("path")
const swaggerUI = require("swagger-ui-express")
const swaggerDoc = require("./config/swagger.json")
const logger = require("./util/logger")
const session = require("express-session")
const env = process.env.NODE_ENV || "development"
const config = require("./config/config.json").token[env]
const sequelize = require("./models/index").sequelize
const sequelizeStore = require("connect-session-sequelize")(session.Store)

// Load .env Enviroment Variables to process.env
require("mandatoryenv").load(["DB_HOST", "DB_DATABASE", "DB_USER", "DB_PASSWORD", "PORT", "SECRET"])

const { PORT } = process.env

// Instantiate an Express Application
const app = express()

// configure express session
let store = new sequelizeStore({
	db: sequelize,
	table: "session",
	checkExpirationInterval: 30 * 60 * 1000,
	expiration: 30 * 60 * 1000,
	extendDefaultFields: function(defaults, session) {
		return {
			data: defaults.data,
			expires: defaults.expires,
			userId: session.views.userSession.username
		}
	}
})
store.sync()
app.use(
	session({
		secret: config.secret,
		store: store,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 30 * 60 * 1000
		}
	})
)

app.use(function(req, res, next) {
	if (!req.session.views) {
		req.session.views = {}
	}

	next()
})

// Configure Express App Instance
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Configure swagger-ui
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDoc))

// Configure custom logger middleware
app.use(logger.dev, logger.combined)

app.use(cookieParser())
app.use(cors())
app.use(helmet())

// Assign express-jwt
app.use(jwt())

// Assign Routes
app.use("/", require("./routes/router.js"))

// Handle errors
app.use(errorHandler())

global.appRoot = path.resolve(__dirname)

module.exports = app
