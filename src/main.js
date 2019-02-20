var app = app || {}

app.main = (function () {	
	"use strict";
	window.onload = init;
	let canvas, ctx, 
		play, pause, 
		canvPlayButton, canvPauseButton, 
		audio, state, 
		fighter, enemy, 
		bg, bgName, bgColors, 
		beamPos, 
		ballRadius, stars, 
		analyserNode, gainNode, audioCtx;
		
	let ballsToDraw = [];
	let ballLoc = [];
	let balls = [];
	const buttonLoc = {
		"play" : [100, 120],
		"pause" : [525, 120]
	};
	
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
		"android18" : ["#f8c518", "#f0e030", "#f8f878", "yellow"],
		"cell" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],
		"majinbuu" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"],
		"frieza" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"]				
	};
	
	function init()
	{
		canvas = document.querySelector("canvas");
		ctx = canvas.getContext("2d");

		const NUM_SAMPLES = 128;
		
		//Getting elements from the DOM
		play = new Image();
		play.src = "media/fighters/gokuIdle.png";
		pause = new Image();
		pause.src = "media/fighters/friezaIdle.png";
		bg = new Image();
		bg.src = "media/bg/worldTournament.png";
		bgColors = app.utilities.setBgColors(ctx);
		canvPauseButton = new Image();
		canvPauseButton.src = "media/pause_small.png";
		canvPlayButton = new Image();
		canvPlayButton.src = "media/play_small.png";
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
		//ctx.fillStyle = beamColors[fighter];
		
		audioCtx = new (window.AudioContext || window.webkitAudioContext); // to support Safari and mobile
		let sourceNode = audioCtx.createMediaElementSource(audio); 
		analyserNode = audioCtx.createAnalyser();
		analyserNode.fftSize = NUM_SAMPLES;
		gainNode = audioCtx.createGain();
		gainNode.gain.value = 1;
		sourceNode.connect(gainNode);
		gainNode.connect(analyserNode);
		analyserNode.connect(audioCtx.destination);

		canvas.onmousedown = doMousedown;
		document.querySelector("#volumeLabel").innerHTML = 50;

		// attach musicChange script
		document.querySelector("#songSelector").onchange = musicChange;
		
		// handle changing of fighter/enemy
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

		document.querySelector("#volumeSlider").oninput = function(e) {
			gainNode.gain.value = e.target.value;
			document.querySelector("#volumeLabel").innerHTML = Math.round((e.target.value/2 * 100));
		}

		document.querySelector("#addBall").onclick = addBall;
		document.querySelector("#remBall").onclick = remBall;

		//Setting up full screen 
		document.querySelector("#fullscreenBut").onclick = _ =>{
				requestFullscreen(canvas);
			};
	
		// update for beam creation and animation
		update();
	}

	// play music and change state to play
	function playMusic()
	{
		audioCtx.resume(); // needed for chrome to play music
		audio.play();
		state = "Play";
		
		// this needs to be reset in case the user restarts the same song
		pause.src = "media/fighters/" + enemy + "Idle.png";
	}
	
	// Pausing the music when the pause button is pressed
	// State is not set to "idle" because this would look jarring, as the beam stays out
	function pauseMusic()
	{
		audio.pause(); 
		audioCtx.suspend();
	}

	// poc play/pause button on canvas functionality
	// does NOT work in fullscreen
	// buttons show, but they move, so it does not work atm
	function doMousedown(e)
	{
		let mouse = app.utilities.getMouse(e);
		if(mouse.x > buttonLoc["play"][0] && mouse.x < buttonLoc["play"][0] + canvPlayButton.width && mouse.y > buttonLoc["play"][1] && mouse.y < buttonLoc["play"][0] + canvPlayButton.height)
		{
			playMusic();
		}
		
		if(mouse.x > buttonLoc["pause"][0] && mouse.x < buttonLoc["pause"][0] + canvPauseButton.width && mouse.y > buttonLoc["pause"][1] && mouse.y < buttonLoc["pause"][0] + canvPauseButton.height)
		{
			pauseMusic();
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
	}

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
		let data = new Uint8Array(analyserNode.frequencyBinCount); // OR analyserNode.fftSize/2
		//Showing frequency 
		analyserNode.getByteFrequencyData(data);
		//analyserNode.getByteTimeDomainData(data);

		// clear everything and redraw all dragon balls
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
			
			for (let i = 0; i < 64; i++)
			{
				let percent = data[i] / 255;
				percent = percent < .07 ? .07 : percent;
				
				ctx.save();
				ctx.fillStyle = beamColors[fighter][2];
				ctx.translate(balls[0].x, balls[0].y);		// behind center ball
				ctx.scale(1, -1);
				
				let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
				ctx.rotate(rotationAmount);
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
			analyserNode.getByteTimeDomainData(data);
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
		
		// necessary so fighters are always above beam
		drawFighters();
		
		// if song is over, change enemy state to "dmgd" and add beamcap
		if(audio.duration == audio.currentTime)
		{
			pause.src = "media/fighters/" + enemy + "Dmgd.png";
			let beamCap = new Image();
			beamCap.src = "media/" + beamColors[fighter][3] + "BeamCap.png";
			ctx.drawImage(beamCap, 600, beamPos[fighter][1] - 13);
		}
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
		ctx.drawImage(canvPlayButton, buttonLoc["play"][0], buttonLoc["play"][1]);
		ctx.drawImage(canvPauseButton, buttonLoc["pause"][0], buttonLoc["pause"][1]);
	}
	
	// helper function to draw fighters
	function drawFighters()
	{
		// draw fighter
		ctx.drawImage(play, 17, CANVAS_HEIGHT - 120);
		
		// flip and draw enemy
		ctx.save();
		ctx.scale(-1, 1);
		ctx.drawImage(pause, -662, CANVAS_HEIGHT - 120);
		ctx.restore();
	}
	
	// helper function to redraw balls
	function redrawAll()
	{
		// redraw background
		drawBg();
		
		// fighters are redrawn separately so they can be on top of beam at all times
		
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