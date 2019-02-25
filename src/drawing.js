var app = app || {}

app.drawing = (function () {

    // helper function to draw background
	function drawBg(ctx, bg, bgName, bgColors, buttonLoc, CANVAS_HEIGHT, CANVAS_WIDTH)
	{
		// change bg source if it's new
		if (bg.src != "media/bg/" + bgName + ".png")
			bg.src = "media/bg/" + bgName + ".png";
		
		// fill entire canvas with correct background color
		ctx.fillStyle = bgColors[bgName];
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// draw image
		ctx.drawImage(bg, (CANVAS_WIDTH - bg.width) / 2, CANVAS_HEIGHT - bg.height);
		
		// redraw buttons with fillText using font awesome
		ctx.font = '64px "Font Awesome 5 Free"';
		ctx.fillStyle = "black";
		
		ctx.fillText("\uf144", buttonLoc["play"][0], buttonLoc["play"][1]);
		ctx.fillText("\uf28b", buttonLoc["pause"][0], buttonLoc["pause"][1]);
	}

	// helper function to draw fighters
	function drawFighters(ctx, play, CANVAS_HEIGHT, pause, perc = 0)
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
	
	// helper function to draw progress bar beam
	function drawBeam(audio, play, ctx, beamColors, beamPos, fighter, beamCap, BEAM_MIDDLE_COLOR, BEAM_HEIGHT, CANVAS_HEIGHT, pause, state = "Play", perc = audio.duration / audio.currentTime)
	{
		// define percent value
		let percent = audio.currentTime / audio.duration;
		
		// if state is play, be sure fighter is set to play image
		if (state == "Play")
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
		
		// change beamCap source based on color of beam
		beamCap.src = "media/other/" + beamColors[fighter][3] + "BeamCap.png";
		
		// only draw beam and redraw fighters if state is play
		if (state == "Play")
		{
			ctx.drawImage(beamCap, (beamPos[fighter][0] - 13) + (525 * percent), beamPos[fighter][1] - 13);
			drawFighters(ctx, play, CANVAS_HEIGHT, pause, perc);
		}

	}
	
	// helper function to draw visualizer stuff (frequency, waveform)
	function drawVisualizer(analyserNode, balls, ctx, beamColors, fighter, spinAmount, drawStyle, BAR_WIDTH, ballRadius, effects)
	{
		// get frequency data
		let data = new Uint8Array(analyserNode.frequencyBinCount); // OR analyserNode.fftSize/2
		
		//Showing frequency 
		analyserNode.getByteFrequencyData(data);		

		//Drawing bars around the center ball
		//Creating temporary variables
		let startPerc;
		let startVal;
		
		for (let i = 0; i < 64; i++)
		{
			let percent = data[i] / 255;
			percent = percent < .07 ? .07 : percent; // this sets a min bar height
			
			// set variables to make it a little more readable
			let bar = balls[0].maxBar;
			let barPerc = bar * percent;
			
			// set fill and stroke styles to be colors based on current fighter
			ctx.save();
			ctx.fillStyle = beamColors[fighter][2];
			ctx.strokeStyle = beamColors[fighter][2];
			ctx.translate(balls[0].x, balls[0].y);		// behind center ball
			ctx.scale(1, -1);
			
			// rotate around circle
			let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
			ctx.rotate(rotationAmount + spinAmount);
			ctx.translate(0, bar / 1.1);
			
			// change drawing based on drawStyle
			switch(drawStyle)
			{
				default:
				case "rect":
					// fill base rect
					ctx.fillRect(0, 0, BAR_WIDTH, barPerc);
					
					// stroke rects so they can be seen on any bg
					ctx.lineWidth = BAR_WIDTH / 4;
					ctx.strokeStyle = beamColors[fighter][0];
					ctx.strokeRect(0, 0, BAR_WIDTH, barPerc);
					break;
					
				case "line":
					// essentially the same as above, but not as thick
					ctx.beginPath();
					ctx.moveTo(0,0)
					ctx.lineTo(0, barPerc);
					ctx.lineWidth = BAR_WIDTH / 3;
					ctx.closePath();
					ctx.stroke();
					break;
			}
			
			// outline curves
			if(effects["showOutline"])
			{
				// set styles
				ctx.lineWidth = 2;
				ctx.strokeStyle = beamColors[fighter][3];
				
				// grab last index value
				let start = i - 1 < 0 ? data[0] / 255 : data[i - 1] / 255;
				
				// set startPerc and startVal at index 0
				if(i == 0)
				{
					startPerc = percent;
					startVal = start;
				}
				
				// draw curve
				ctx.beginPath();					
				ctx.bezierCurveTo(0, barPerc, 0, barPerc, BAR_WIDTH * (ballRadius * 0.04), bar * start); // BAR_WIDTH * (ballRadius * 0.04) makes it so it visually looks like they are connecting
				ctx.stroke();
				
				// if last loop, add extra line
				if(i == 63)
				{
					ctx.lineTo(0, bar * startPerc);
					ctx.stroke();
				}
				
				// close the path
				ctx.closePath();
			}			
			ctx.restore();
		}
		
		// make sure first ball is redrawn over bars
		balls[0].redraw();

		// draw waveform
		if (effects["showWave"])
		{
			//Switching to waveform data
			analyserNode.getByteTimeDomainData(data);
			
			//Drawing bars around the center ball
			for (let i = 0; i < 64; i++)
			{
				let percent = data[i] / 255;
				percent = percent < .07 ? .07 : percent;
				
				ctx.save();
				ctx.globalAlpha = .5; // this way the ball can still be partially seen
				
				ctx.fillStyle = beamColors[fighter][2];		// bar colors change with fighters
				ctx.translate(balls[0].x, balls[0].y);		// behind center ball
				ctx.scale(1, -1);
				
				// rotation around the circle
				let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
				ctx.rotate(rotationAmount + spinAmount);
				ctx.translate(0, balls[0].maxBar / 1.1);
				ctx.scale(1,-1);
				ctx.fillRect(0, 0, BAR_WIDTH, balls[0].maxBar * percent * .5);
				
				// stroke rects so they can be seen on any bg
				ctx.lineWidth = BAR_WIDTH / 4;
				ctx.strokeStyle = beamColors[fighter][0];
				ctx.strokeRect(0, 0, BAR_WIDTH, balls[0].maxBar * percent * .5);
				
				ctx.restore();
			}
		}
	}
	
	//Adding visual effects to the 
    function addEffects(ctx, effects)
	{
		//Grab image data
		let imageData = ctx.getImageData(0,0,ctx.canvas.width, ctx.canvas.height);

		//Getting info about the array
		let data = imageData.data;
		let length = data.length;

		//Looping through the pixels to add effects
		for(let i = 0; i < length; i +=4)
		{
			//Add blue tint
			if(effects["isTint"])
				data[i+2] = data[i+2] + 100;

			//Invert colors
			if(effects["isInvert"])
			{
				let red = data[i], green = data[i+1], blue = data[i+2];
				data[i] = 255 - red;
				data [i+1] = 255 - green;
				data [i+2] = 255 - blue;

			}

			//Add visual noise
			if(effects["isNoise"] && Math.random() < .1)
			{
				data[i] = data[i+1] = data[i+2] = 12;
				data[i+3] = 255;
			}
		}

		//Applying the image to the canvas
		ctx.putImageData(imageData, 0,0);
	}


	//Redrawing all the main elements onto the canvas
    function redrawAll(ctx,bg,bgName,bgColors,buttonLoc,CANVAS_HEIGHT,CANVAS_WIDTH, play, pause, balls, ballRadius, ballLoc)
	{
		// redraw background
		drawBg(ctx, bg, bgName, bgColors, buttonLoc, CANVAS_HEIGHT, CANVAS_WIDTH);
		
		// fighters are drawn here so the enemy can be behind beam at song end
		drawFighters(ctx, play, CANVAS_HEIGHT, pause);
		
		// redraw dragon balls
		for (let i = 0; i < balls.length; i++)
		{
			if (i == 0)
				balls[i].redraw(ballRadius);
			else
				balls[i].redraw(ballRadius/2, ballLoc[i][0], ballLoc[i][1], ctx);
		}
	}

    return{
        drawBg,
        drawFighters,
		drawBeam, 
		drawVisualizer, 
        addEffects,
        redrawAll
    }
})();