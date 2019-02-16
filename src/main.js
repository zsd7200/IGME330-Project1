	
	"use strict";
	window.onload = init;
	let canvas, ctx, play, pause, playButton, pauseButton, audio, state, fighter, enemy, beamPos, analyserNode, ballRadius, stars, gainNode;
	let ballsToDraw = [];
	let ballLoc = [];
	let balls = [];
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
		playButton = document.querySelector("#play"); 
		pauseButton = document.querySelector("#pause");
		play = new Image();
		play.src = "media/gokuIdle.png";
		pause = new Image();
		pause.src = "media/friezaIdle.png";
		audio = document.querySelector("#audio");
		state = play.src.substr(-8).substr(0, 4); // result will be either Idle or Play
		
		// setup sliders and labels
		ballRadius = 70;
		stars = random(1, 7);
		document.querySelector("#radiusLabel").innerHTML = ballRadius;
		
		// fill up ballstodraw array
		ballsToDraw.push(stars)
		
		// fill array
		for (let i = 0; i < 6; i++)
			ballsToDraw.push(random(1,7, ballsToDraw));
			
		// splice array to remove stars variable from ballsToDraw array since it is already drawn
		ballsToDraw = ballsToDraw.splice(1, 6);
		
		// initialize beamPos with values from CSS
		beamPos = setBeamPos();
		
		// draw big ball in center of canvas and push it to array of balls
		balls.push(new DragonBall(ctx, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, ballRadius, stars));
		updateBallLoc();
		
		// set default fighter and enemy to Goku/Frieza
		fighter = "goku";
		enemy = "frieza";
		ctx.fillStyle = beamColors[fighter];
		
		let audioCtx = new (window.AudioContext || window.webkitAudioContext); // to support Safari and mobile
		let sourceNode = audioCtx.createMediaElementSource(audio); 
		analyserNode = audioCtx.createAnalyser();
		analyserNode.fftSize = NUM_SAMPLES;
		gainNode = audioCtx.createGain();
		gainNode.gain.value = 1;
		sourceNode.connect(gainNode);
		gainNode.connect(analyserNode);
		analyserNode.connect(audioCtx.destination);

		document.querySelector("#volumeLabel").innerHTML = 50;

		// Starting the play music when the play button is pressed, and setting the state to "Play"
		playButton.onclick = function(e) {
			audioCtx.resume(); // needed for chrome to play music
			audio.play();
			state = "Play";
			
			// this needs to be reset in case the user restarts the same song
			pause.src = "media/" + enemy + "Idle.png";
		};

		// Pausing the music when the pause button is pressed
		// State is not set to "idle" because this would look jarring, as the beam stays out
		pauseButton.onclick = function(e) { audio.pause(); audioCtx.suspend(); };

		// attach musicChange script
		document.querySelector("#songSelector").onchange = musicChange;
		
		// handle changing of fighter/enemy
		document.querySelector("#playSelector").onchange = function(e){ fighter = e.target.value; ctx.clearRect(17, 17, 100, 100); };

		document.querySelector("#pauseSelector").onchange = function(e) { enemy = e.target.value; pause.src = "media/" + enemy + "Idle.png"; ctx.clearRect(575, 17, 100, 100); };
		
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
	
	// handle setting beam position based on left and top from #play object's CSS values
	function setBeamPos(left = 25, top = 25)
	{
		// beamPos[fighter][0] = x
		// beamPos[fighter][1] = y
		// width is changed based on time left in song
		// height is BEAM_HEIGHT
		let tempPos = {
			"goku" : [60 + parseInt(left, 10), 30 + parseInt(top, 10)],
			"vegeta" : [60 + parseInt(left, 10), 20 + parseInt(top, 10)],
			"teenGohan" : [55 + parseInt(left, 10), 35 + parseInt(top, 10)],
			"futureTrunks" : [60 + parseInt(left, 10), 11 + parseInt(top, 10)],
			"android18" : [70 + parseInt(left, 10), 20 + parseInt(top, 10)],
			"cell" : [67 + parseInt(left, 10), 22 + parseInt(top, 10)],
			"majinbuu" : [68 + parseInt(left, 10), 25 + parseInt(top, 10)],
			"frieza" : [70 + parseInt(left, 10), 20 + parseInt(top, 10)]				
		};
		
		return tempPos;
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
			pause.src = "media/" + enemy + "Idle.png";
		}
		
		// handle door.wav since it's not an mp3 lmao
		if (e.target.value != "door")
			audio.src = "media/" + e.target.value + ".mp3";
		else
			audio.src = "media/door.wav";
		
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
		
		// Changing the state of the sprite based on the playing status
		if(state == "Play")
		{
			let percent = audio.currentTime / audio.duration;
			play.src = "media/" + fighter + "Play.png";

			// clear everything and redraw all dragon balls
			redrawAll();
			
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
				ctx.fillStyle = beamColors[fighter][0];
				ctx.translate(balls[0].x, balls[0].y);		// behind center ball
				ctx.scale(1, -1);
				
				let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
				ctx.rotate(rotationAmount);
				ctx.translate(0, balls[0].maxBar / 1.1);
				ctx.fillRect(0, 0, BAR_WIDTH, balls[0].maxBar * percent);
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
			play.src = "media/" + fighter + "Idle.png";
		
		drawFighters();
		
		// if song is over, change enemy state to "dmgd" and add beamcap
		if(audio.duration == audio.currentTime)
		{
			pause.src = "media/" + enemy + "Dmgd.png";
			let beamCap = new Image();
			beamCap.src = "media/" + beamColors[fighter][3] + "BeamCap.png";
			ctx.drawImage(beamCap, 600, beamPos[fighter][1] - 13);
		}
	}
	
	// helper function to update ballLoc array based on ballRadius
	function updateBallLoc()
	{
		ballLoc = [
			[CANVAS_WIDTH/2, CANVAS_HEIGHT/2],
			[CANVAS_WIDTH/2 + ballRadius * 1.75, CANVAS_HEIGHT/2],
			[CANVAS_WIDTH/2 - ballRadius * 1.75, CANVAS_HEIGHT/2],
			[CANVAS_WIDTH/2 + ballRadius * 1.25, CANVAS_HEIGHT/2 - ballRadius * 1.25],
			[CANVAS_WIDTH/2 - ballRadius * 1.25, CANVAS_HEIGHT/2 - ballRadius * 1.25],
			[CANVAS_WIDTH/2 + ballRadius * 1.25, CANVAS_HEIGHT/2 + ballRadius * 1.25],
			[CANVAS_WIDTH/2 - ballRadius * 1.25, CANVAS_HEIGHT/2 + ballRadius * 1.25]
		];
	}
	
	// helper function to draw fighters
	function drawFighters()
	{
		// draw fighters
		ctx.drawImage(play, 17, 17);
		
		ctx.save();
		ctx.scale(-1, 1);
		ctx.drawImage(pause, -662, 17);
		ctx.restore();
	}
	
	// helper function to redraw balls
	function redrawAll()
	{
		// clear everything
		ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
		
		// draw background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// redraw everything
		for (let i = 0; i < balls.length; i++)
		{
			if (i == 0)
				balls[i].redraw(ballRadius);
			else
				balls[i].redraw(ballRadius/2, ballLoc[i][0], ballLoc[i][1]);
		}
	}
	
	// randy helper function
	function random(min, max, arr)
	{
		let num = Math.floor((Math.random() * max) + min);
	
		if (arr == null)
			return num;
		
		
		// if there is an array passed in, make sure there are no duplicate returns
		// https://stackoverflow.com/questions/27406377/javascript-generate-random-number-except-some-values?noredirect=1&lq=1
		
		let dupe = false; 										// set bool	to false
		for (let i = 0; i < arr.length; i++)
			if (num == arr[i])
				dupe = true;									// if num is equal to a value in the array, change it to true
				
		return (dupe == false) ? num : random(min, max, arr);	// if dupe is false, return num, otherwise, call random again
	}