//express is a node framework, it is the most populoar one so far
var express = require('express');

//create express web application object
var app = express();

//body-parser module extract teh entire body portion of incoming request
//and expose it on req.body as sth easier to interface with
var bodyParser = require('body-parser');

//middleware that only parse urlencoded bodies. If extended set to false,
//value of key-value pair can only be string or array, it can any type if it is set to true
var urlencodedParser = bodyParser.urlencoded({extended: false});
var path = require('path');
var mqtt = require('mqtt');

//higer level mongodb drive
var mongoose = require('mongoose');
mongoose.connect('localhost:27017/Gainesville');

//server API 
var socket = require('socket.io');
var client = mqtt.connect('mqtt://test.mosca.io');
var router = require('./router/index');
var PORT = 8000;
var Schema = mongoose.Schema;

var UserDataSchema = new Schema({
  user_id: String,
  missing_people_id: String
});

exports.UserData = UserData = mongoose.model('UserData', UserDataSchema);

var server = app.listen(PORT, function(){
  console.log('listening ' + PORT);
});

//handle incoming requests through the express middleware
app.use(urlencodedParser);

app.use('/', router);
app.use('/static', express.static('./static'));

//pass server to socket.io, not the express app
var io = socket(server);

app.get('/', function(req, res){
  //join all the arguments ans normalize the resulting path
  res.sendFile(path.join(__dirname, './view', 'user.html'));
});

var missing_list;
//the server is a client of the mqtt broker, 
//attach the client to two events(connect and message)
client.on('connect', function(){
  client.subscribe('Gainesville');
  console.log('subscribe to Gainesville');

  //publish missing list to other mqtt clients
  //client.publish('Gainesville', missing_list);
});


client.on('message', function(topic, message){
  //we don't care if the topic is not Gainesville
  if (topic === 'Gainesville'){
      console.log('Receiving a message regarding Gainesville region!');

      //var message_string = message.toString();
      console.log(message.toString());
      var temp = message.toString().split(",");
      var user_id = temp[0];
      var missing_people_id = temp[1];
      var status = temp[2];
      console.log('Status of the incoming request is %s', status);
      
      if (status === 'create'){
        var newUser = {user_id: user_id, missing_people_id: missing_people_id};
        var newUserData = new UserData(newUser);
        newUserData.save();

        //attach info about the missing person and publish this message to other mqtt clients
        
        /////////////////////////
        //fetch basic info(photo, height and weight, ect) from database, or just broadcast URL
        var outMessage;
        //client.broadcast('Gainesville', outMessage);

        console.log(newUserData + ' is in missing list');
      }
      else if(status === 'found') {
        //make an announcement that the person has been found
        var announcement = 'Thanks for your time and help, ' + missing_people_id + ' has been found.';
        client.publish('Gainesville', announcement);
      }
      else if (status === 'delete'){
      //the parent requst to delete the chid from missing list
          UserData.findOneAndRemove({missing_people_id: missing_people_id}, function(err){
            if (err)
              return console.log(err);
            else {
              //updateMissingList();
              console.log(missing_people_id + ' is deleted');
            }
          });
      }
      else {
        console.log('Invalid post!');
        return;
      }

});

function updateMissingList() {

}



//////////////////////////
//setting up connection to talk to web application
io.on('connection', function(socket){
  console.log('A new client is connected, here is the missling list!');
  socket.emit('message', missing_list);

  socket.on('update_location', function(data){
    socket.emit(data.id, data.location);
    //io.emit(data.id, data.location);
  });
});