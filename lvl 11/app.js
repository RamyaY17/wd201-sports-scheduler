const express = require("express");
const app = express();
const { User, Sports } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
var csurf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");

const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csurf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(flash());
app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch((error) => {
          return done(null, false, {
            message: "Account doesn't exist for this mail id",
          });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.set("view engine", "ejs");

app.get("/", async (request, response) => {
  response.render("index", {
    title: "Sports-Scheduler",
    "csrfToken": request.csrfToken(), //prettier-ignore
  });
});

app.get("/login", (request, response) => {
  response.render("index", {
    title: "Login",
    "csrfToken": request.csrfToken(), //prettier-ignore
  });
});

app.get("/signout", (request, response) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.post("/users", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  const existingUser = await User.findOne({
    where: {
      email: request.body.email,
    },
  });
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(error);
      }
      return response.redirect("/userHomePage/n");
    });
  } catch (error) {
    return response.send("Already exist");
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get(
  "/Sports/:name",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const SportsName = request.params.name;
    const getSportName = await sessions.getSport(SportsName);
    const getDate = new Date().toISOString();
    const playersCount = await players.findAll({
      where: {
        sportmatch: request.params.name,
      },
    });
    const UserId = request.user.id;
    return response.render("sportDetailPage", {
      name: SportsName,
      "csrfToken": request.csrfToken(), //prettier-ignore
      getSportName,
      getDate,
      UserId,
      playersCount,
    });
  }
);

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    console.log(request.user);
    if (
      request.body.email === "ramyaadmin@gmail.com" &&
      request.body.password === "ramya0708"
    ) {
      return response.redirect("/admin");
    }
    return response.redirect(`/userHomePage/n`);
  }
);

app.get(
  "/userHomePage/n",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUserName = await User.findOne({
      where: {
        id: request.user.id,
      },
    });
    const sportsItems = await Sports.findAll();
    if (request.accepts("html")) {
      response.render("userHomePage", {
        sportsItems: sportsItems,
        csrfToken: request.csrfToken(),
        getUserName, //prettier-ignore
      });
    }
  }
);

app.get(
  "/admin",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const getUserName = await User.findOne({
      where: {
        id: request.user.id,
      },
    });
    const sportsItems = await Sports.findAll();
    const sportsItemsUser = await Sports.findOne();
    if (request.accepts("html")) {
      response.render("adminHomePage", {
        sportsItems: sportsItems,
        "csrfToken": request.csrfToken(), //prettier-ignore
        user: sportsItemsUser,
        getUserName,
      });
    }
  }
);

app.get(
  "/sportsCreation",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    return response.render("sportsCreation", {
      "csrfToken": request.csrfToken(), //prettier-ignore
    });
  }
);

app.post("/newsport", async (request, response) => {
  const inputFieldNewSport = request.body.Sports_Name;
  const newData = await Sports.create({
    Sports_Name: inputFieldNewSport,
  });
  return response.redirect("/admin");
});

module.exports = app;
