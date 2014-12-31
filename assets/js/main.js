//require('nw.gui').Window.get().showDevTools();

var sonos = require('sonos');

var Listener = require('sonos/lib/events/listener');

var util = require('util');

xml2js = require('xml2js');

console.log('\nSearching for Sonos devices on network...');
var devices = [];

var progress;

sonos.search(function(device, model) {
    var devInfo = '\n';
    var html;

    device.getCurrentState(function(err,state){
        if(state=='playing') eventListener(device);
    });

    device.deviceDescription(function(err,data){
        if(data.roomName)
            devices.push({host:device.host,roomName:data.roomName,displayName:data.displayName});
        if(data.displayName!='BRIDGE') {
            html = '<div class="device play-five" id="' + device.host + '">' + data.roomName + ' ('+data.displayName+')' + '</div>';
            $('#devices').append(html);
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

    eventListener(Sonos);

    Sonos.getMusicLibrary('albums', {start: 0, total: 25}, function(err, result){
        $('#grid').html('');
        $.each(result['items'], function(item,value){
            if(value.albumArtURL.indexOf('/')==0) value.albumArtURL = 'http://'+Sonos.host+':'+Sonos.port+value.albumArtURL;
            html = '<div class="element"> <div class="meta"><img onerror="this.src=\'assets/img/no-cover.png\'" class="cover" src="'+value.albumArtURL+'"> <h4 class="artist">'+value.artist+'</h4> <p class="album">'+value.title+'</p> </div> </div>';
            $('#grid').append(html);
        });
    });
        updateInfo(Sonos);
    });

    $('div#controls').on('click','span',function () {

        var host = $(this).parents('#controls').attr('class');

        var button = $(this).attr('class');

        window[button](host);

        console.log(button);

    });
});

function updateInfo(Sonos) {

    $('#controls').removeClass().addClass(Sonos.host);

    Sonos.getCurrentState(function(err,state) {
        if (state == 'playing') {
            $('.play i').removeClass('fa-play').addClass('fa-pause');
        }
        else {
            $('.play i').removeClass('fa-pause').addClass('fa-play');
            clearInterval(progress);
        }
    });

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
            $('section#playing > div#album').css('background-image','url("'+track.albumArtURL+'")');
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
            Sonos.play(function(err, playing) {
                $('.play i').removeClass('fa-play').addClass('fa-pause');
                state = playing;
            });

        }
        updateInfo(Sonos);
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

        x.addService('/MediaRenderer/AVTransport/Event', function(error, sid) {
        //x.addService('/QPlay/Event', function(error, sid) {
            if (error) throw err;
            console.log('Successfully subscribed, with subscription id', sid);
        });

        x.on('serviceEvent', function(endpoint, sid, data) {
            updateInfo(Sonos, 'playing');
            //console.log('Received event from', endpoint, '(' + sid + ') with data:', data, '\n\n');
            //if ((!util.isArray(data)) || (data.length < 1)) return {};
            var LastChange = data.LastChange;
            if (LastChange) {
                return (new xml2js.Parser()).parseString(LastChange, function (err, data) {
                        console.log(data.Event.InstanceID[0]);
                    }
                );
            }
        });
    });
}