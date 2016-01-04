require('nw.gui').Window.get().showDevTools();

var sonos = require('sonos');

var Listener = require('sonos/lib/events/listener');

var util = require('util');

xml2js = require('xml2js');

console.log('\nSearching for Sonos devices on network...');
var devices = [];

var progress;

var mainSid = [];

sonos.search(function(device, model) {
    var devInfo = [];
    var html;

  device.deviceDescription(function(err,data){
    if(data.displayName!='BRIDGE' && data.displayName!='BOOST') {

      device.getTopology(function(err,info){
        _.each(info.zones, function(zone){
          html = '';
          console.log(zone);
          if(zone.coordinator=='true') {
            if(zone.name == data.roomName)
            {
              html = '<div class="device play-five" id="' + device.host + '">' + zone.name + ' ('+data.displayName+')' + '</div>';
            }
          }
        });
        $('#devices').append(html);
      });


      device.getCurrentState(function(err,state){
        devInfo.push({host:device.host,roomName:data.roomName,displayName:data.displayName});
        if(state=='playing') eventListener(device);
      });
    }
  });
/*
    devInfo += 'Device \t' + JSON.stringify(device) + ' (' + model + ')\n';
    device.getZoneAttrs(function(err, attrs) {
        if (err) devInfo += '`- failed to retrieve zone attributes\n';
        devInfo += '`- attrs: \t' + JSON.stringify(attrs).replace(/",/g, '",\n\t\t') + '\n';

        device.getZoneInfo(function(err, info) {
            if (err) devInfo += '`- failed to retrieve zone information\n';
            //devices.push(info);
            devInfo += '`- info: \t' + JSON.stringify(info).replace(/",/g, '",\n\t\t') + '\n';

            device.getTopology(function(err, info) {
                devInfo += '`- topology: \t' + JSON.stringify(info.zones).replace(/",/g, '",\n\t\t') + '\n';
                //console.log(devInfo);
            });
        });
    });
    */
});

$( document ).ready(function() {

$('#devices').on('click','.device',function(){
    player = $(this).attr('id');

    $('#controls').removeClass().addClass(player);

    Sonos = new sonos.Sonos(player);

    eventListener(Sonos,mainSid);

    });

    $('#browseby').on('click','li', function () {

        var host = $('#controls').attr('class');

        var browseby = $(this).attr('id');

        Sonos = new sonos.Sonos(host);

        Sonos.getMusicLibrary(browseby,{start: 0, total: 25}, function(err, result){
            console.log(result);
            $('#elements').html('');

            $.each(result['items'], function(item,value){
              //console.log(value);
              html = '<div class="element"><div class="meta"><img onerror="this.src=\'assets/img/no-cover.png\'" class="cover" src="'+value.albumArtURL+'"><div class="mask"><a class="play" href="'+value.uri+'"><i class="fa fa-play-circle-o"></i></a></div><h4 class="artist">'+value.artist+'</h4><p class="album">'+value.title+'</p></div></div>';
                // '<div class="element"> <div class="meta"><img onerror="this.src=\'assets/img/no-cover.png\'" class="cover" src="'+value.albumArtURL+'"> <h4 class="artist">'+value.artist+'</h4> <p class="album">'+value.title+'</p> </div> </div>';
                $('#elements').append(html);
            });
        });
    });

    $('div#controls').on('click','span',function () {

        var host = $(this).parents('#controls').attr('class');

        var button = $(this).attr('class');

        window[button](host);

        console.log(button);

    });

  $('#grid').on('click','a', function (){

    var host = $('#controls').attr('class');

    file = $(this).attr('href');

    Sonos = new sonos.Sonos(host);

    Sonos.play(file,function (err,playing){
        console.log(err);
    });

  });

  $('ul.items').on('click','li',function () {

    var host = $('#controls').attr('class');

    var button = $(this).attr('id');

    Sonos = new sonos.Sonos(host);

    Sonos.getMusicLibrary(button,{start: 0, total: 25}, function(err, result){
      $('#elements').html('');

      $.each(result['items'], function(item,value){
        html = '<div class="element"><div class="meta"><img onerror="this.src=\'assets/img/no-cover.png\'" class="cover" src="'+value.albumArtURL+'"><div class="mask"><a class="play" href="'+value.uri+'"><i class="fa fa-play-circle-o"></i></a></div><h4 class="artist">'+value.artist+'</h4><p class="album">'+value.title+'</p></div></div>';
        $('#elements').append(html);
      });
    });

  });
});

function updateInfo(Sonos) {

    $('#controls').removeClass().addClass(Sonos.host);

    Sonos.currentTrack(function(err, track) {
        if(track) {
            setProgress(track.duration, track.position);
            $('#info h1').html(track.title);
            $('#info h3').html(track.artist);

            if (track.albumArtURL) {
                if (track.albumArtURL.indexOf('/') == 0)
                    track.albumArtURL = 'http://' + Sonos.host + ':' + Sonos.port + track.albumArtURL;
            }
            else
                track.albumArtURL = 'assets/img/no-cover.png';
            $('section#playing > div#album').css('background-image','url("'+decodeURIComponent(track.albumArtURL)+'")');
        }
        });

    Sonos.getCurrentState(function(err,state) {
        if (state == 'playing') {
            $('#controls .play i').removeClass('fa-play').addClass('fa-pause');
        }
        else {
            $('#controls .play i').removeClass('fa-pause').addClass('fa-play');
            clearInterval(progress);
        }
    });
}

function updateProgress()
{
    var position;
    var max = $('#progress progress').attr('max');
    progress = setInterval(function () {
        position =  $('#progress progress').val();
        position++;
        $('#progress progress').val(position);
        if(position==max) clearInterval(progress);
    }, 1000);
}

function setProgress(max,position)
{
    $('#progress progress').attr('max',max).val(position);
    clearInterval(progress);
    updateProgress();
}

function pause(host)
{
    Sonos = new sonos.Sonos(host);
    Sonos.pause(function(err, stopped) {
       updateInfo(Sonos);
        return stopped;
    });
}

function play(host,file)
{
    Sonos = new sonos.Sonos(host);

    Sonos.getCurrentState(function(err,state){
        if(state=='playing') {
           state =  pause(host);
        }
        else {
            Sonos.play(file, function(err, playing) {
                $('#controls .play i').removeClass('fa-play').addClass('fa-pause');
                state = playing;
            });

        }
        updateInfo(Sonos);
        return state;
    });
}

function forward(host)
{

}

function rewind(host)
{

}

function mute(host)
{
    Sonos = new sonos.Sonos(host);
    Sonos.getMuted(function(err,muted){
       if(muted)
       {
           Sonos.setMuted(false,function(){

               $('.mute i').removeClass('fa-volume-off').addClass('fa-volume-up');
               return false;
           });
       }
        else
       {
           Sonos.setMuted(true,function(){
               $('.mute i').removeClass('fa-volume-up').addClass('fa-volume-off');
               return true;
           });
       }
    });
}

function repeat(host)
{

}

function replay(host)
{

}

function eventListener(Sonos)
{
    var x = new Listener(Sonos);
    x.listen(function(err) {
        if (err) throw err;

      console.log(mainSid);
/*
      if(mainSid.length >0) {
        _.each(mainSid,function (element){
          if(Sonos.host==element.host) {
            x.removeService(element.sid, function (err, callback) {
              console.log('Successfully unsubscribed, with subscription id', element.sid);
            });
          }
        });
      }
*/
        x.addService('/MediaRenderer/AVTransport/Event', function(error, sid) {
            if (error) throw err;
            mainSid.push({'host':Sonos.host, 'sid':sid});
            console.log('Successfully subscribed, with subscription id', sid);
        });

        x.addService('/MediaRenderer/RenderingControl/Event', function(error, sid) {
            if (error) throw err;
            mainSid.push({'host':Sonos.host, 'sid':sid});
            console.log('Successfully subscribed, with subscription id', sid);
        });

        x.on('serviceEvent', function(endpoint, sid, data) {
            updateInfo(Sonos, 'playing');
            //console.log('Received event from', endpoint, '(' + sid + ') with data:', data, '\n\n');
            //if ((!util.isArray(data)) || (data.length < 1)) return {};
            var LastChange = data.LastChange;
          /*
          if (LastChange) {
                return (new xml2js.Parser()).parseString(LastChange, function (err, data) {
                        console.log(data.Event.InstanceID[0]);
                    }
                );
            }
            */
        });
    });
}
function listMusicServices(Sonos)
{

  Sonos.getAccounts(function (err, accounts){
    Sonos.getMusicServices(function (err, data) {
      $('#services').html('');
      _.each(data.items, function (item) {
        _.each(accounts, function (account){
          if(account.type==item.id) {
            html = '<li class="item"><i class="fa fa-' + item.serviceName.toLowerCase() + '"></i> ' + item.serviceName + '('+item.nick+')</li>';
            $('#services').append(html);
          }
        });
      });

    });
  });

}