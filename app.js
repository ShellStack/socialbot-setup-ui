var express           =     require('express')
  , redis             =     require('redis')
  , passport          =     require('passport')
  , util              =     require('util')
  , FacebookStrategy  =     require('passport-facebook').Strategy
  , TwitterStrategy   =     require('passport-twitter').Strategy
  , session           =     require('express-session')
  , redisStore        =     require('connect-redis')(session)
  , bodyParser        =     require('body-parser')
  , config            =     require('./configuration/config')
  , mysql             =     require('mysql')
  , request           =     require('request')
  , client            =     redis.createClient()
  , app               =     express();

//Define MySQL parameter in Config.js file.
var connection = mysql.createConnection({
  host     : config.host,
  user     : config.username,
  password : config.password,
  database : config.database
});

//Connect to Database only if Config.js parameter is set.

if(config.use_database==='true')
{
    connection.connect();
}

// Passport session setup.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the TwitterStrategy within Passport.

passport.use(new TwitterStrategy({
    consumerKey: config.twitter_api_key,
    consumerSecret:config.twitter_api_secret ,
    callbackURL: config.twitter_callback_url
  },
  function(token, tokenSecret, profile, done) {
    process.nextTick(function () {
      console.log(profile);
      //Check whether the User exists or not using profile.id
      profile['twitterToken'] = token;
      return done(null, profile);
    });
  }
));

// Use the FacebookStrategy within Passport.

passport.use(new FacebookStrategy({
    clientID: config.facebook_api_key,
    clientSecret:config.facebook_api_secret ,
    callbackURL: config.callback_url
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
	//console.log(accessToken);
      console.log(profile);
      //Check whether the User exists or not using profile.id

      //extend the token
      var url = "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id="+config.facebook_api_key+"&client_secret="+config.facebook_api_secret+"&fb_exchange_token="+accessToken;
      request(url,function(error,response,body) {
        if(error) {
          console.log(error);
        } else {
          console.log(body.split("=")[1]);
          profile['accessToken'] = body.split("=")[1];
          // get the pages
          console.log("getting pages");
          var pageUrl = 'https://graph.facebook.com/v2.8/'+profile.id+'/accounts/?access_token='+profile['accessToken'];
          request(pageUrl,function(error,response,body) {
            if(error) {
              console.log(error);
            }
            body = JSON.parse(body);
            var pages = [];
            if(body.paging) {
              // no need of pagination
              body.data.map(function(page) {
                if(page.perms.indexOf('ADMINISTER','BASIC_ADMIN') !== -1) {
                  pages.push(page);
                }
              });
            } else {
              // will see what to do about pagination.
            }
            console.log("got pages");
            //console.log(pages);
            profile['pages'] = pages;
            //console.log("now returning profile----\n",profile);
            return done(null, profile);
          });
        }
      });
    });
  }
));


app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(session({
    secret: 'ssshhhhh',
    // create new redis store.
    store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl :  260}),
    saveUninitialized: false,
    resave: false
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/views'));

// home page to let user create scheduler
app.get('/', function(req, res){
  res.render('index.html');
});

// website

app.get('/website',function(req,res) {
  res.render('website.html');
});

//plugin

app.get('/plugin',function(req,res) {
  res.render('plugin.html');
});

// social auth

app.get('/social',function(req,res) {
  //console.log("User data = \n",req.user ? req.user.pages: null);
  var response = {'data': null};
  if(req.user) {
    response.data = {'provider': req.user.provider,'pages': req.user.provider === 'facebook'? req.user.pages: null,'twitterToken': req.user.provider === 'twitter'?req.user.twitterToken:null};
  }
  res.render('social.html',response);
});

// schedule

app.get('/schedule',function(req,res) {
  res.render('schedule.html');
});

//review and create scheduler

app.get('/review',function(req,res) {
  res.render('review.html');

});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account.html', { user: req.user });
});

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { successRedirect : '/social', failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/social');
  });

app.get('/auth/facebook', passport.authenticate('facebook',{scope:['manage_pages','publish_actions','email']}));


app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect : '/social', failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/social');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/pages',function(req,res) {
  if(req.user) {
    var url = 'https://graph.facebook.com/v2.8/'+req.user.id+'/accounts/?access_token='+req.user.accessToken;
    request(url,function(error,response,body) {
      if(error) {
        console.log(error);
      }
      body = JSON.parse(body);
      var pages = [];
      if(body.paging) {
        // no need of pagination
        body.data.map(function(page) {
          if(page.perms.indexOf('ADMINISTER','BASIC_ADMIN') !== -1) {
            pages.push(page);
          }
        });
      } else {
        // will see what to do about pagination.
      }
      res.json(pages);
    });
  }
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

app.listen(8080);
