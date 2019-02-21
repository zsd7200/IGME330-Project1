var app = app || {}

app.main = (function () {	
	"use strict";
	window.onload = init;

	//Variables
	let canvas, ctx, 
		play, pause, 
		audio, state, 
		fighter, enemy, shen,
		bg, bgName, bgColors,
		isFullscreen,
		beamPos, beamCap, 
		isPaused,
		ballRadius, stars, 
		isInvert, isTint, isNoise,
		testSpin,filterType, dropdownText,
		analyserNode, gainNode, biquadFilter, audioCtx;
		
	//Arrays
	let ballsToDraw = [];
	let ballLoc = [];
	let balls = [];
	const buttonLoc = {
		"play" : [100, 176, 410, 260],
		"pause" : [525, 176, 1020, 260]
	};
	let shenDraw = [false, false]; // shenDraw[0] is whether or not it is currently drawing, shenDraw[1] is whether or not to always draw it
	
	//Constants
	const BEAM_MIDDLE_COLOR = "#f3f3f3";
	const BEAM_HEIGHT = 30;
	
	const BAR_WIDTH = 5;
	const PADDING = 5;
	
	const CANVAS_HEIGHT = 600;
	const CANVAS_WIDTH = 700;
	
	
	// dictionary of beam colors based on fighter name
	// beamColors[fighter][0] = darkest color	(first)
	// beamColors[fighter][1] = mid	color		(second)
	// beamColors[fighter][2] = lightest color	(third)
	// then BEAM_MIDDLE_COLOR
	// beamColors[fighter][3] = beam endcap color
	
	const beamColors = {
		"goku" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],
		"vegeta" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"],
		"teenGohan" : ["#f8c518", "#f0e030", "#f8f878", "yellow"],
		"futureTrunks" : ["#f8c518", "#f0e030", "#f8f878", "yellow"],
		"gotenks" : ["#f8c518", "#f0e030", "#f8f878", "yellow"],
		"android18" : ["#f8c518", "#f0e030", "#f8f878", "yellow"],
		"dad" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],
		"cell" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],
		"majinbuu" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"],
		"frieza" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"]				
	};
	
	function init()
	{
		canvas = document.querySelector("canvas");
		ctx = canvas.getContext("2d");
		let dragBox = document.querySelector("#dragBox");
		let drag = document.querySelector("#drag");

		dragBox.ondragover = function(e) { e.preventDefault(); drag.style.backgroundColor = "rgba(0,0,0, 0.8)"; };
		dragBox.ondragleave = function(e) { e.preventDefault(); drag.style.backgroundColor = "rgba(0,0,0, 0.5)"; };
		dragBox.onmouseover = function(e) { e.preventDefault(); drag.style.backgroundColor = "rgba(0,0,0, 0.8)"; };
		dragBox.onmouseleave = function(e) { e.preventDefault(); drag.style.backgroundColor = "rgba(0,0,0, 0.5)"; };
		
		// play dropped in file
		dragBox.ondrop = function(e) { e.preventDefault(); drag.style.backgroundColor = "rgba(0,0,0, 0.5)"; if(e.dataTransfer.files.length > 1) drag.innerHTML = "Please only drag in one file!"; else customMusicHandler(e.dataTransfer.files[0]); };
		
		// force a hidden input for file upload dialog
		// https://www.aspsnippets.com/Articles/Open-Fileupload-Upload-File-on-Button-Click-using-JavaScript-and-jQuery.aspx
		dragBox.onclick = function(e) { document.querySelector("#clickUpload").click(); };
		
		// play file from input
		document.querySelector("#clickUpload").oninput = function (e) { customMusicHandler(document.querySelector("#clickUpload").files[0]); };


		const NUM_SAMPLES = 128;
		
		//Getting elements from the DOM
		play = new Image();
		play.src = "media/fighters/gokuIdle.png";
		pause = new Image();
		pause.src = "media/fighters/friezaIdle.png";
		bg = new Image();
		bg.src = "media/bg/worldTournament.png";
		bgColors = app.utilities.setBgColors(ctx);
		shen = new Image();
		shen.src = "media/other/shenron.png";
		beamCap = new Image();
		audio = document.querySelector("#audio");
		state = play.src.substr(-8).substr(0, 4); // result will be either Idle or Play
		
		// setup sliders and labels
		ballRadius = 70;
		stars = app.utilities.random(1, 7);
		document.querySelector("#radiusLabel").innerHTML = ballRadius;
		
		// fill up ballstodraw array
		ballsToDraw.push(stars)
		
		// fill array
		for (let i = 0; i < 6; i++)
			ballsToDraw.push(app.utilities.random(1,7, ballsToDraw));
			
		// splice array to remove stars variable from ballsToDraw array since it is already drawn
		ballsToDraw = ballsToDraw.splice(1, 6);
		
		// initialize beamPos with values from CSS
		beamPos = app.utilities.setBeamPos();
		
		// draw big ball in center of canvas and push it to array of balls
		balls.push(new DragonBall(ctx, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, ballRadius, stars));
		updateBallLoc();
		
		// set default fighter and enemy to Goku/Frieza
		fighter = "goku";
		enemy = "frieza";
		bgName = "worldTournament";
		
		//Setting up the audio graph
		audioCtx = new (window.AudioContext || window.webkitAudioContext); // to support Safari and mobile
		let sourceNode = audioCtx.createMediaElementSource(audio); 
		analyserNode = audioCtx.createAnalyser();
		analyserNode.fftSize = NUM_SAMPLES;
		gainNode = audioCtx.createGain();
		gainNode.gain.value = 1;
		biquadFilter = audioCtx.createBiquadFilter();
		sourceNode.connect(gainNode);
		gainNode.connect(biquadFilter);
		biquadFilter.connect(analyserNode);
		analyserNode.connect(audioCtx.destination);

		biquadFilter.type = "highshelf";
		filterType = "None";
		dropdownText = document.querySelector("#dropdownMenuButton");

		isFullscreen = isPaused = isInvert = isTint = isNoise = false;
		testSpin = 0;

		// attach musicChange script
		document.querySelector("#songSelector").onchange = musicChange;
		
		// handle changing of fighter/enemy/background
		document.querySelector("#playSelector").onchange = function(e){ fighter = e.target.value; };

		document.querySelector("#pauseSelector").onchange = function(e) { enemy = e.target.value; pause.src = "media/fighters/" + enemy + "Idle.png"; };
		
		document.querySelector("#bgSelector").onchange = function (e) { bgName = e.target.value; redrawAll(); };
		
		// handle changing stars and radius based on sliders
		document.querySelector("#ballRad").oninput = function(e) { 
			ballRadius = parseInt(e.target.value, 10);
			document.querySelector("#radiusLabel").innerHTML = parseInt(e.target.value, 10);
			ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			
			// updateBallLoc updates ballLoc array based on new ballRadius
			updateBallLoc();
			redrawAll();
		};


		//Changing volume
		document.querySelector("#volumeLabel").innerHTML = 50;
		document.querySelector("#volumeSlider").oninput = function(e) {
			gainNode.gain.value = e.target.value;
			document.querySelector("#volumeLabel").innerHTML = Math.round((e.target.value/2 * 100));
		}

		//Handling the adding and removal of additional dragon balls
		document.querySelector("#addBall").onclick = addBall;
		document.querySelector("#remBall").onclick = remBall;
		document.querySelector("#remBall").disabled = true;
		
		//Summoning Shenron
		document.querySelector("#shenBut").onclick = function(e) {
			shenDraw[0] = true;
			document.querySelector("#shenBut").disabled = true;
			document.querySelector("#remBall").disabled = true;			
			shenronFade("in");
			
			// wait until shenron is fully faded in to change buttons around
			setTimeout(function(e) { 
				document.querySelector("#unshenBut").disabled = false;
			}, 3000); 
		};
		
		//Unsummoning shenron
		document.querySelector("#unshenBut").onclick = function(e) {
			shenDraw[0] = true;
			shenDraw[1] = false; // this is necessary here because of shenron being drawn in update
			document.querySelector("#unshenBut").disabled = true;
			shenronFade("out");
			
			// wait until shenron is fully faded out to change buttons around
			setTimeout(function(e) { 
				document.querySelector("#shenBut").disabled = false;
				document.querySelector("#remBall").disabled = false;	
			}, 3000); 
		};

		//Setting up full screen 
		document.querySelector("#fullscreenBut").onclick = _ =>{
				requestFullscreen(canvas);

			};
		
		//Allowing for keyboard control 
		document.addEventListener("keydown", function(event){
			//Using the spacebar to toggle play pause 
			if(event.keyCode == 32)
				if(isPaused)
					playMusic();
				else
					pauseMusic();
			
			//Adding fullscreen mode with F
			if(event.keyCode == 70)
				if(isFullscreen == false)
					requestFullscreen(canvas);

			
		});

		//Adding event for clicking on the vanvas
		canvas.onmousedown = doMousedown;

		//Adding listeners for the dropdown menu for audio effects
		document.querySelector("#noneFilter").onclick = function(e){ filterType = "None"; dropdownText.innerHTML = "None"};
		document.querySelector("#lowPFilter").onclick = function(e){ filterType = "lowpass"; dropdownText.innerHTML = "Lowpass"};
		document.querySelector("#highPFilter").onclick = function(e){ filterType = "highpass"; dropdownText.innerHTML = "Highpass"};
		document.querySelector("#bandPFilter").onclick = function(e){ filterType = "bandpass"; dropdownText.innerHTML = "Bandpass"};
		document.querySelector("#lowSFilter").onclick = function(e){ filterType = "lowshelf"; dropdownText.innerHTML = "Lowshelf"};
		document.querySelector("#highSFilter").onclick = function(e){ filterType = "highshelf"; dropdownText.innerHTML = "Highshelf"};



		//Adding listeners for checkboxes
		document.querySelector('#tintCB').checked = isTint;
		document.querySelector('#invertCB').checked = isInvert;
		document.querySelector('#noiseCB').checked = isNoise;
		document.querySelector('#tintCB').onchange = e => isTint = e.target.checked;
		document.querySelector('#invertCB').onchange = e => isInvert = e.target.checked;
		document.querySelector('#noiseCB').onchange = e => isNoise = e.target.checked;

		// update for beam creation and animation
		update();
	}

	// handle animation of shenron fading in/out
	function shenronFade(inout)
	{
		// set a timer equal to 0 or 1 based on fading in or out respectively
		let timer;
		
		if(inout == "in") { timer = 0; }
		else { timer = 1 }
		
		// setInterval function goes off every 25 miliseconds
		// declaring it as a variable allows me to stop it whenever
		let fade = setInterval(function() {
			
			// clear where shenron was and redraw everything else
			ctx.clearRect(CANVAS_WIDTH/2 - 200, 0, shen.width, shen.height);
			redrawAll();
			
			// increment or decrement timer based on in/out
			if (inout == "in") { timer += 0.01; }
			else { timer -= 0.01; }
			
			// set global alpha equal to timer and draw shenron, then reset global alpha to 1
			ctx.globalAlpha = timer;
			ctx.drawImage(shen, CANVAS_WIDTH/2 - 200, 0);
			ctx.globalAlpha = 1;
			
			// if shenron has faded in, stop this loop
			if (timer >= 1)
			{
				clearInterval(fade);
				shenDraw[0] = false;
				shenDraw[1] = true;
			}
			// if shenron has faded out, do the same
			else if (timer <= 0)
			{
				clearInterval(fade);
				shenDraw[0] = false;
			}
		}, 25);
	}

	function customMusicHandler(file)
	{
		// make sure it's a useable type of audio, it doesn't like wma for some reason
		if(file.type.substr(0, 5) == "audio" && file.type != "audio/x-ms-wma")
		{
			// change innerHTML to say what it's playing
			drag.innerHTML = "Now playing... " + file.name;
			audio.src = window.URL.createObjectURL(file);			// https://stackoverflow.com/questions/28619550/javascript-play-uploaded-audio
			playMusic();
		}
		
		// otherwise say it's not supported
		else
			drag.innerHTML = "Not an accepted audio file!";
	}

	// play music and change state to play
	function playMusic()
	{
		audioCtx.resume(); // needed for chrome to play music
		audio.play();
		state = "Play";
		isPaused = false;
		
		// this needs to be reset in case the user restarts the same song
		pause.src = "media/fighters/" + enemy + "Idle.png";
	}
	
	// Pausing the music when the pause button is pressed
	// State is not set to "idle" because this would look jarring, as the beam stays out
	function pauseMusic()
	{
		audio.pause(); 
		isPaused = true;
	}

	//Allows the play and pause buttons to work within the canvas
	function doMousedown(e)
	{
		let mouse = app.utilities.getMouse(e);

		//Setting different positions for play/pause button interaction based on whether the canvas is full screen or not
		if(isFullscreen == false)
		{
			if(mouse.x > buttonLoc["play"][0] && mouse.x < buttonLoc["play"][0] + 64 && mouse.y > buttonLoc["play"][1] - 64 && mouse.y < buttonLoc["play"][1])
			{
				playMusic();
			}
			
			if(mouse.x > buttonLoc["pause"][0] && mouse.x < buttonLoc["pause"][0] + 64 && mouse.y > buttonLoc["pause"][1] - 64 && mouse.y < buttonLoc["pause"][1])
			{
				pauseMusic();
			}
		}
		else
		{
			if(mouse.x > buttonLoc["play"][2] && mouse.x < buttonLoc["play"][2] + 64 && mouse.y > buttonLoc["play"][3] - 64 && mouse.y < buttonLoc["play"][3])
			{
				playMusic();
			}
			
			if(mouse.x > buttonLoc["pause"][2] && mouse.x < buttonLoc["pause"][2] + 64 && mouse.y > buttonLoc["pause"][3] - 64 && mouse.y < buttonLoc["pause"][3])
			{
				pauseMusic();
			}
		}

	}
	
	// addBall method
	function addBall()
	{	
		// check if there are any balls left to draw
		if (ballsToDraw.length > 0)
		{
			// push it to balls array
			balls.push(new DragonBall(ctx, ballLoc[balls.length][0], ballLoc[balls.length][1], ballRadius/2, ballsToDraw[ballsToDraw.length - 1]));
			
			// pop star count from ballsTODraw array
			ballsToDraw.pop();
		}
		
		if (ballsToDraw.length == 0)
		{
			document.querySelector("#shenBut").disabled = false;
			document.querySelector("#addBall").disabled = true;
		}
		
		document.querySelector("#remBall").disabled = false;
			
	}
	
	// remove ball method
	function remBall()
	{
		// if it is not the center ball
		if (balls.length - 1 != 0)
		{
			// set variables to make this a bit more readible
			let ballToRemove = balls[balls.length - 1]
			let radCalc = ballToRemove.rad + ballToRemove.lineWidth;
			
			// clear rect but only for that ball
			ctx.clearRect(ballToRemove.x - radCalc, ballToRemove.y - radCalc, ballToRemove.x + radCalc, ballToRemove.y + radCalc);
			
			// push star count back to ballsToDraw array
			ballsToDraw.push(ballToRemove.stars);
			
			// pop out of balls array
			balls.pop();
			
			// wipe everything and redraw
			redrawAll();
		}
		
		document.querySelector("#shenBut").disabled = true;
		document.querySelector("#addBall").disabled = false;
	}

	//Making the canvas go full screen
	function requestFullscreen(element)
	{
		if (element.requestFullscreen) {
			  element.requestFullscreen();
			} else if (element.mozRequestFullscreen) {
			  element.mozRequestFullscreen();
			} else if (element.mozRequestFullScreen) { // camel-cased 'S' was changed to 's' in spec
			  element.mozRequestFullScreen();
			} else if (element.webkitRequestFullscreen) {
			  element.webkitRequestFullscreen();
			}
	}
	
	// handles if music is changed from dropdown
	function musicChange(e)
	{
		// if music is currently playing, pause it
		if(state == "Play")
		{
			audio.pause();
			state = "Idle";
		}
		
		// if song is over, then the beamcap is out and the enemy is in it's "dmgd" state
		// return enemy to idle state and return the enemy to its proper z-index so it can be clicked
		if (audio.duration == audio.currentTime)
		{
			pause.src = "media/fighters/" + enemy + "Idle.png";
		}
		
		// handle door.wav since it's not an mp3 lmao
		if (e.target.value != "door")
			audio.src = "media/music/" + e.target.value + ".mp3";
		else
			audio.src = "media/music/door.wav";
		
		// wipe everything and redraw balls
		redrawAll();
	}

	// used for creation of beam
	function update()
	{	
		requestAnimationFrame(update);

		//Changing the audio before the data is retrieved
		modifyAudio();
		let data = new Uint8Array(analyserNode.frequencyBinCount); // OR analyserNode.fftSize/2
		//Showing frequency 
		analyserNode.getByteFrequencyData(data);
		//analyserNode.getByteTimeDomainData(data);

		//Getting information as to the fullscreen status of the canvas
		if(document.fullscreen == false)
		{
			isFullscreen = false;
		}
		else
		{
			isFullscreen = true;
		}

		// clear everything and redraw all dragon balls
		if (shenDraw[0] == false)
			redrawAll();

		// Changing the state of the sprite based on the playing status
		if(state == "Play")
		{
			let percent = audio.currentTime / audio.duration;
			play.src = "media/fighters/" + fighter + "Play.png";
			
			// draw darkest color first
			ctx.fillStyle = beamColors[fighter][0];
			ctx.fillRect(beamPos[fighter][0], beamPos[fighter][1], 525 * percent, BEAM_HEIGHT);
			
			// middle color second
			ctx.fillStyle = beamColors[fighter][1];
			ctx.fillRect(beamPos[fighter][0], beamPos[fighter][1] + 2, 525 * percent, BEAM_HEIGHT - 4);
			
			// light color third
			ctx.fillStyle = beamColors[fighter][2];
			ctx.fillRect(beamPos[fighter][0], beamPos[fighter][1] + 2.5, 525 * percent, BEAM_HEIGHT - 5);
			
			// finish with white/BEAM_MIDDLE_COLOR in center
			ctx.fillStyle = BEAM_MIDDLE_COLOR;
			ctx.fillRect(beamPos[fighter][0], beamPos[fighter][1] + 4.5, 525 * percent, BEAM_HEIGHT - 9);	
			
			beamCap.src = "media/other/" + beamColors[fighter][3] + "BeamCap.png";
			ctx.drawImage(beamCap, (beamPos[fighter][0] - 13) + (525 * percent), beamPos[fighter][1] - 13);
			
			// draw shenron if he has been summoned
			if (shenDraw[1] == true)
				ctx.drawImage(shen, CANVAS_WIDTH/2 - 200, 0);
			
			//Drawing bars around the center ball
			for (let i = 0; i < 64; i++)
			{
				let percent = data[i] / 255;
				percent = percent < .07 ? .07 : percent;
				
				ctx.save();
				ctx.fillStyle = beamColors[fighter][2];
				ctx.translate(balls[0].x, balls[0].y);		// behind center ball
				ctx.scale(1, -1);
				
				let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
				ctx.rotate(rotationAmount + testSpin);
				ctx.translate(0, balls[0].maxBar / 1.1);
				ctx.fillRect(0, 0, BAR_WIDTH, balls[0].maxBar * percent);
				
				// stroke rects so they can be seen on any bg
				ctx.lineWidth = BAR_WIDTH / 4;
				ctx.strokeStyle = beamColors[fighter][0];
				ctx.strokeRect(0, 0, BAR_WIDTH, balls[0].maxBar * percent);
				
				ctx.restore();
			}
			
			// make sure first ball is redrawn over bars
			balls[0].redraw();

			//Switching to waveform data
			//analyserNode.getByteTimeDomainData(data);
			//Displaying the waveform as an innercircle to the ball, scalable to multiple balls
			//TODO: Figure out how to only display parts of the waveform, if we want multiple balls
			for(let i = 0; i < data.length; i++){
				for(let j = 0; j < balls.length *2; j+=2)
				{
					let percent2 = data[i] / 255;

					ctx.save();
					ctx.fillStyle = "rgba(100,100,100,.3)";
					ctx.beginPath();
					ctx.arc(ballLoc[j], ballLoc[j+1], ballRadius * percent2,0,  2*Math.PI, false);
					ctx.fill();
					ctx.closePath();
					ctx.restore();
				}
			}
		}
		else if (state == "Idle")
			play.src = "media/fighters/" + fighter + "Idle.png";
		
		// draw shenron if he has been summoned
		if (shenDraw[1] == true)
			ctx.drawImage(shen, CANVAS_WIDTH/2 - 200, 0);
		
		// necessary so fighters are always above beam
		// this call will _only_ draw fighter when song is over
		// this means that enemy will be drawn in redrawAll(), and will be behind
		// both the beam and the beam cap
		drawFighters(audio.duration / audio.currentTime);
		
		// if song is over, change enemy state to "dmgd"
		if(audio.duration / audio.currentTime == 1)
			pause.src = "media/fighters/" + enemy + "Dmgd.png";
		
		testSpin += .01;
		addEffects();
		
	}

	//Change the audio effect of the song based on the selection from the dropdown
	function modifyAudio()
	{
		//If there is no filter, take away the gain from the filter
		if(filterType == "None")
		{
            biquadFilter.gain.setValueAtTime(0, audioCtx.currentTime);
		}
		//Applying the filter, adding frequency and gain to make it noticable
		else 
		{
			biquadFilter.type = filterType;
			biquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
            biquadFilter.gain.setValueAtTime(25, audioCtx.currentTime);
		}
	}

	function addEffects()
	{
		//Grab image data
		let imageData = ctx.getImageData(0,0,ctx.canvas.width, ctx.canvas.height);

		//Getting info about the array
		let data = imageData.data;
		let length = data.length;
		let width = imageData.width;

		//Looping through the pixels

		let i;
		for(i = 0; i < length; i +=4)
		{
			if(isTint)
			{
				data[i+2] = data[i+2] + 100;
			}

			if(isInvert)
			{
				let red = data[i], green = data[i+1], blue = data[i+2];
				data[i] = 255 - red;
				data [i+1] = 255 - green;
				data [i+2] = 255 - blue;

			}

			if(isNoise && Math.random() < .1)
			{
				data[i] = data[i+1] = data[i+2] = 128

				data[i+3] = 255;
			}
		}

		//Applying the image to the canvas
		ctx.putImageData(imageData, 0,0);
	}
	
	// helper function to update ballLoc array based on ballRadius
	function updateBallLoc()
	{
		let ballX = CANVAS_WIDTH/2;
		let ballY = CANVAS_HEIGHT/2;
		
		ballLoc = [
			[ballX, ballY],
			[ballX + ballRadius * 1.75, ballY],
			[ballX - ballRadius * 1.75, ballY],
			[ballX + ballRadius * 1.25, ballY - ballRadius * 1.25],
			[ballX - ballRadius * 1.25, ballY - ballRadius * 1.25],
			[ballX + ballRadius * 1.25, ballY + ballRadius * 1.25],
			[ballX - ballRadius * 1.25, ballY + ballRadius * 1.25]
		];
	}
	
	// helper function to draw background
	function drawBg()
	{
		if (bg.src != "media/bg/" + bgName + ".png")
			bg.src = "media/bg/" + bgName + ".png";
		
		ctx.fillStyle = bgColors[bgName];
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.drawImage(bg, (CANVAS_WIDTH - bg.width) / 2, CANVAS_HEIGHT - bg.height);
		
		// redraw buttons
		ctx.font = '64px "Font Awesome 5 Free"';
		ctx.fillStyle = "black";
		
		ctx.fillText("\uf144", buttonLoc["play"][0], buttonLoc["play"][1]);
		ctx.fillText("\uf28b", buttonLoc["pause"][0], buttonLoc["pause"][1]);
	}
	
	// helper function to draw fighters
	function drawFighters(perc = 0)
	{
		// draw fighter
		ctx.drawImage(play, 17, CANVAS_HEIGHT - 120);
		
		// if perc (audio.duration/audio.time) = 1 (which means the song is over), do not draw enemy over beam
		if (perc != 1)
		{
			// flip and draw enemy
			ctx.save();
			ctx.scale(-1, 1);
			ctx.drawImage(pause, -662, CANVAS_HEIGHT - 120);
			ctx.restore();
		}

	}
	
	// helper function to redraw balls
	function redrawAll()
	{
		// redraw background
		drawBg();
		
		// fighters are drawn here so the enemy can be behind beam at song end
		drawFighters();
		
		// redraw dragon balls
		for (let i = 0; i < balls.length; i++)
		{
			if (i == 0)
				balls[i].redraw(ballRadius);
			else
				balls[i].redraw(ballRadius/2, ballLoc[i][0], ballLoc[i][1]);
		}
	}

	return{
		init
	}
})();