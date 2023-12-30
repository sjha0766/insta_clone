var express = require('express');
var router = express.Router();
const passport=require('passport');
const localStrategy=require('passport-local');
const userModel=require('./users');
const postModel=require('./post');
const upload=require('./multer');
passport.use(new localStrategy(userModel.authenticate()));


router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.post('/register', async (req, res) => {
  try {
    const userData = new userModel({
      username: req.body.username,
      email: req.body.email,
      name: req.body.name
    });
    await userModel.register(userData, req.body.password);
    passport.authenticate('local')(req, res, () => res.redirect('/login'));
  } catch (error) {                                                         
    console.error('Registration error:', error);
    res.status(500).send('Internal Server Error');
  }
});
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};
router.get('/login', function(req, res) {
  res.render('login', {footer: false,error:req.flash('error')},);
});
router.post('/login',passport.authenticate('local',{
  successRedirect:'/feed',
  failureRedirect:'/login',
  failureFlash:true
}),
function(req,res){

});

router.route('/logout')
  .get((req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  })
  .post(isLoggedIn, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/login');
    });
  });

router.get('/profile', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('posts');
  res.render('profile', { footer: true, user });
});

console.log('hello');


router.get('/feed', isLoggedIn, async function(req, res) {
  const user=await userModel.findOne({username:req.session.passport.user});
  const post=await postModel.find().populate('user');
  res.render('feed', {footer: true,post,user});
});

router.get('/profile', isLoggedIn,async function(req, res) {
  const user=await userModel.findOne({username:req.session.passport.user}).populate('posts');
  res.render('profile', {footer: true,user});
});

router.get('/search', isLoggedIn,function(req, res) {
  res.render('search', {footer: true});
});

router.get('/username/:username',isLoggedIn,async(req,res)=>{
  const regex = new RegExp(`^${req.params.username}`, 'i');
  const users=await userModel.find({username:regex});

res.json(users); 
 
   
})

router.get('/edit', upload.single('image'), async function(req, res) {
  const user=await userModel.findOne({username:req.session.passport.user});
  res.render('edit', {footer: true,user});
});

router.get('/upload',isLoggedIn, function(req, res) {
  res.render('upload', {footer: true});
});

router.post('/upload',isLoggedIn,upload.single('image'), async(req,res)=>{
  const user=await userModel.findOne({username:req.session.passport.user});
  const post=await postModel.create({
    picture:req.file.filename,
    user:user._id,
    caption:req.body.caption
  });
  user.posts.push(post._id);
  await user.save();

  res.redirect('/feed');
});

router.post('/update', upload.single('image'), async (req, res) => {
  try {
    const user = await userModel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    );

    if (req.file) {
      user.profileImage = req.file.filename;
      await user.save(); 
    }

    res.redirect('/profile');
  } catch (error) {
    // Handle the error appropriately (e.g., log it or send an error response)
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/like/post/:id',isLoggedIn,async(req,res)=>{
  const user=await userModel.findOne({username:req.session.passport.user});
  const post=await postModel.findOne({_id:req.params.id});

  if(post.likes.indexOf(user._id)===-1){
   post.likes.push(user._id);
  }
  else{
  post.likes.splice(post.likes.indexOf(user._id),1);
  }
  await post.save();
   res.redirect('/feed');

})




module.exports = router;
