var app = app || {}

app.main = (function () {	
	"use strict";

	//Variables
	let canvas, ctx, 
		play, pause, 
		audio, state, isPaused,
		fighter, enemy, shen,
		bg, bgName, bgColors,
		beamPos, beamCap, drawStyle,
		ballRadius, stars,
		spinAmount, spinSpeed, 
		filterType, dropdownText,
		analyserNode, gainNode, biquadFilter, audioCtx;
		
	//Arrays
	let ballsToDraw = [];
	let ballLoc = [];
	let balls = [];
	const buttonLoc = {
		"play" : [100, 176, 410, 260],
		"pause" : [525, 176, 1020, 260]
	};
	
	// dictionary of bools for shenron drawing
	let shenDraw = {
		"currentlyDrawing" : false,
		"isDrawn" : false
	};
	
	// dictionary of bools for visual effects
	let effects = {
		"isTint" : false,
		"isInvert" : false,
		"isNoise" : false,
		"showWave" : false,
		"showOutline" : false
	};
	
	//Constants
	const BEAM_MIDDLE_COLOR = "#f3f3f3";
	const BEAM_HEIGHT = 30;
	const BAR_WIDTH = 5;
	
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
		"dad" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],					// dad = bardock
		"cell" : ["#009aa4", "#00cedb", "#00f0ff", "blue"],
		"majinbuu" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"],
		"frieza" : ["#9e00a0", "#d100d4", "#fc00ff", "purple"]				
	};
	
	function init()
	{
		//Getting the canvas
		canvas = document.querySelector("canvas");
		ctx = canvas.getContext("2d");
		
		// add listeners for dragging and dropping audio files
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
		ballLoc = app.utilities.updateBallLoc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, ballRadius);
		
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
		filterType = "none";

		//Initializing miscellaneous variables
		spinAmount = 0;
		spinSpeed = 0;
		drawStyle = "rect";
		dropdownText = document.querySelector("#dropdownMenuButton");


		// attach musicChange script
		document.querySelector("#songSelector").onchange = musicChange;
		
		// handle changing of fighter/enemy/background
		document.querySelector("#playSelector").onchange = function(e){ fighter = e.target.value; };

		document.querySelector("#pauseSelector").onchange = function(e) { enemy = e.target.value; pause.src = "media/fighters/" + enemy + "Idle.png"; };
		
		document.querySelector("#bgSelector").onchange = function (e) { bgName = e.target.value; app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc); };
		
		//Handling the changing of the drawing style for the frequency
		document.querySelector("#rect").onchange = function(e){if (e.target.value == "on") drawStyle = "rect";}
		document.querySelector("#line").onchange = function(e){if (e.target.value == "on") drawStyle = "line";}


		// handle changing stars and radius based on sliders
		document.querySelector("#ballRad").oninput = function(e) { 
			ballRadius = parseInt(e.target.value, 10);
			document.querySelector("#radiusLabel").innerHTML = parseInt(e.target.value, 10);
			ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			
			// updateBallLoc updates ballLoc array based on new ballRadius
			ballLoc = app.utilities.updateBallLoc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, ballRadius);
			app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc);
		};


		//Changing volume
		document.querySelector("#volumeLabel").innerHTML = 50;
		document.querySelector("#volumeSlider").oninput = function(e) {
			gainNode.gain.value = e.target.value;
			document.querySelector("#volumeLabel").innerHTML = Math.round((e.target.value/2 * 100));
		}

		//Changing the speed at which the bars around the ball spin
		document.querySelector("#spinSpeedLabel").innerHTML = 0;
		document.querySelector("#spinSpeed").oninput = function(e) {
			spinSpeed = (.01 * e.target.value);
			document.querySelector("#spinSpeedLabel").innerHTML = e.target.value;
		}

		//Handling the adding and removal of additional dragon balls
		document.querySelector("#addBall").onclick = addBall;
		document.querySelector("#remBall").onclick = remBall;
		document.querySelector("#remBall").disabled = true;
		
		//Summoning Shenron
		document.querySelector("#shenBut").onclick = function(e) {
			shenDraw["currentlyDrawing"] = true;
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
			shenDraw["currentlyDrawing"] = true;
			shenDraw["isDrawn"] = false; // this is necessary here because of shenron being drawn in update
			document.querySelector("#unshenBut").disabled = true;
			shenronFade("out");
		};

		//Setting up full screen 
		document.querySelector("#fullscreenBut").onclick = _ =>{
				app.utilities.requestFullscreen(canvas);

			};
		
		//Allowing for keyboard control 
		document.addEventListener("keydown", function(event){
			//Using the spacebar to toggle play pause 
			if(event.keyCode == 32)
				//Toggling between the two states
				if(audio.paused)
					playMusic();
				else
					audio.pause();
			
			//Adding fullscreen mode with F
			if(event.keyCode == 70)
				if(document.fullscreen == false)
					app.utilities.requestFullscreen(canvas);

			
		});

		//Adding event for clicking on the vanvas
		canvas.onmousedown = doMousedown;

		//Adding listeners for the dropdown menu for audio effects
		document.querySelector("#noneFilter").onclick = function(e){ filterType = "none"; dropdownText.innerHTML = "Select Audio Filter Type"};
		document.querySelector("#lowPFilter").onclick = function(e){ filterType = "lowpass"; dropdownText.innerHTML = "Lowpass"};
		document.querySelector("#highPFilter").onclick = function(e){ filterType = "highpass"; dropdownText.innerHTML = "Highpass"};
		document.querySelector("#bandPFilter").onclick = function(e){ filterType = "bandpass"; dropdownText.innerHTML = "Bandpass"};
		document.querySelector("#lowSFilter").onclick = function(e){ filterType = "lowshelf"; dropdownText.innerHTML = "Lowshelf"};
		document.querySelector("#highSFilter").onclick = function(e){ filterType = "highshelf"; dropdownText.innerHTML = "Highshelf"};

		//Adding listeners for checkboxes
		document.querySelector('#tintCB').checked = effects["isTint"];
		document.querySelector('#invertCB').checked = effects["isInvert"];
		document.querySelector('#noiseCB').checked = effects["isNoise"];
		document.querySelector('#waveCB').checked = effects["showWave"];
		document.querySelector('#outlineCB').checked = effects["showOutline"];
		document.querySelector('#tintCB').onchange = e => effects["isTint"] = e.target.checked;
		document.querySelector('#invertCB').onchange = e => effects["isInvert"] = e.target.checked;
		document.querySelector('#noiseCB').onchange = e => effects["isNoise"] = e.target.checked;
		document.querySelector('#waveCB').onchange = e => effects["showWave"] = e.target.checked;
		document.querySelector('#outlineCB').onchange = e => effects["showOutline"] = e.target.checked;

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
		
			// if fading in, most things can be handled by redrawAll
			if (inout == "in")
				app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc);
			
			// if fading out, redrawAll cannot be used, as balls need to be cleared
			if (inout == "out")
			{
				for(let i = 1; i < 7; i++)
				{
					ctx.clearRect(balls[i].x - balls[i].rad, balls[i].y - balls[i].rad, balls[i].x + balls[i].rad, balls[i].y + balls[i].rad);
					app.drawing.drawBg(ctx, bg, bgName, bgColors, buttonLoc, CANVAS_HEIGHT, CANVAS_WIDTH);
					app.drawing.drawFighters(ctx, play, CANVAS_HEIGHT, pause);
				}
			}
			
			// draw beam
			app.drawing.drawBeam(audio, play, ctx, beamColors, beamPos, fighter, beamCap, BEAM_MIDDLE_COLOR, BEAM_HEIGHT, CANVAS_HEIGHT, pause, state);
			
			// increment or decrement timer based on in/out
			if (inout == "in") { timer += 0.01; }
			else { timer -= 0.01; }
			
			// set global alpha equal to timer and draw shenron, then reset global alpha to 1
			ctx.globalAlpha = timer;
			
			// if fading out, redraw balls
			if (inout == "out")
				for(let i = 1; i < 7; i++)
					balls[i].redraw(ballRadius/2, ballLoc[i][0], ballLoc[i][1], ctx);
			
			// draw shenron
			ctx.drawImage(shen, CANVAS_WIDTH/2 - 200, 0);

			// reset global alpha to 1 and add effects (if necessary)
			ctx.globalAlpha = 1;
			
			// draw visualizer stuff here so placement is consistent
			app.drawing.drawVisualizer(analyserNode, balls, ctx, beamColors, fighter, spinAmount, drawStyle, BAR_WIDTH, ballRadius, effects);
			
			// add visual effects, if applicable
			app.drawing.addEffects(ctx, effects);
			
			// if shenron has faded in, stop this loop
			if (timer >= 1)
			{
				clearInterval(fade);
				shenDraw["currentlyDrawing"] = false;
				shenDraw["isDrawn"] = true;
			}

			// if shenron has faded out, do the same
			else if (timer <= 0)
			{
				clearInterval(fade);
				shenDraw["currentlyDrawing"] = false;
				shenDraw["isDrawn"] = false;
				
				// remove all balls but first from lists
				for (let i = 1; i < 7; i++)
					remBall();
			}
		}, 25);
	}

	//Handling the addition of custom music via drag and drop
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

	//Allows the play and pause buttons to work within the canvas
	function doMousedown(e)
	{
		let mouse = app.utilities.getMouse(e);

		//Setting different positions for play/pause button interaction based on whether the canvas is full screen or not
		if(document.fullscreen == false)
		{
			if(mouse.x > buttonLoc["play"][0] && mouse.x < buttonLoc["play"][0] + 64 && mouse.y > buttonLoc["play"][1] - 64 && mouse.y < buttonLoc["play"][1])
			{
				playMusic();
			}
			
			if(mouse.x > buttonLoc["pause"][0] && mouse.x < buttonLoc["pause"][0] + 64 && mouse.y > buttonLoc["pause"][1] - 64 && mouse.y < buttonLoc["pause"][1])
			{
				audio.pause();
			}
		}
		//If fullscreen, use alternate positions for play and pause
		else
		{
			if(mouse.x > buttonLoc["play"][2] && mouse.x < buttonLoc["play"][2] + 64 && mouse.y > buttonLoc["play"][3] - 64 && mouse.y < buttonLoc["play"][3])
			{
				playMusic();
			}
			
			if(mouse.x > buttonLoc["pause"][2] && mouse.x < buttonLoc["pause"][2] + 64 && mouse.y > buttonLoc["pause"][3] - 64 && mouse.y < buttonLoc["pause"][3])
			{
				audio.pause();
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
			app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc);
		}
		
		//Disabling the ability to summon Shenron, and enabling the ability to add balls
		document.querySelector("#shenBut").disabled = true;
		document.querySelector("#addBall").disabled = false;
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
		
		// handle door.wav since it's not an mp3
		if (e.target.value != "door")
			audio.src = "media/music/" + e.target.value + ".mp3";
		else
			audio.src = "media/music/door.wav";
		
		// wipe everything and redraw balls
		app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc);
	}

	// used for creation of beam
	function update()
	{	
		requestAnimationFrame(update);

		//Changing the audio before the data is retrieved
		app.utilities.modifyAudio(filterType, biquadFilter, audioCtx);

		// clear everything and redraw all dragon balls
		if (shenDraw["currentlyDrawing"] == false)
			app.drawing.redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc);
		
		// draw shenron if he has been summoned
		if (shenDraw["isDrawn"] == true)
			ctx.drawImage(shen, CANVAS_WIDTH/2 - 200, 0);
		
		// if shenron is currently being drawn, it handles drawing these
		if (shenDraw["currentlyDrawing"] == false)
			app.drawing.drawVisualizer(analyserNode, balls, ctx, beamColors, fighter, spinAmount, drawStyle, BAR_WIDTH, ballRadius, effects);

		// Changing the state of the sprite based on the playing status
		if(state == "Play")
			// if shenron is currently being drawn, it handles drawing these
			if(shenDraw["currentlyDrawing"] == false)
				app.drawing.drawBeam(audio, play, ctx, beamColors, beamPos, fighter, beamCap, BEAM_MIDDLE_COLOR, BEAM_HEIGHT, CANVAS_HEIGHT, pause, state);
		
		else if (state == "Idle")
			play.src = "media/fighters/" + fighter + "Idle.png";
		
		// if song is over, change enemy state to "dmgd"
		if(audio.duration / audio.currentTime == 1)
			pause.src = "media/fighters/" + enemy + "Dmgd.png";
		
		//Adding to the amount the bars spin 
		spinAmount += spinSpeed;
		
		// if shenron is currently being drawn, it handles adding effects
		if(shenDraw["currentlyDrawing"] == false)
			app.drawing.addEffects(ctx, effects);
	}
	
	return{
		init
	}
})();