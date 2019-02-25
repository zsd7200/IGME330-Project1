var app = app || {}

app.drawing = (function () {

    // helper function to draw background
	function drawBg(ctx, bg, bgName, bgColors, buttonLoc, CANVAS_HEIGHT, CANVAS_WIDTH)
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
	
	function drawBeam(audio, play, ctx, beamColors, beamPos, fighter, beamCap, BEAM_MIDDLE_COLOR, BEAM_HEIGHT, CANVAS_HEIGHT, pause, perc = audio.duration / audio.currentTime)
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
		
		drawFighters(ctx, play, CANVAS_HEIGHT, pause, perc);
	}
	
	function drawVisualizer(analyserNode, balls, ctx, beamColors, fighter, spinAmount, drawStyle, BAR_WIDTH, ballRadius)
	{
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
			percent = percent < .07 ? .07 : percent;
			let bar = balls[0].maxBar;
			let barPerc = bar * percent;
			
			ctx.save();
			ctx.fillStyle = beamColors[fighter][2];
			ctx.strokeStyle = beamColors[fighter][2];
			ctx.translate(balls[0].x, balls[0].y);		// behind center ball
			ctx.scale(1, -1);
			
			let rotationAmount = (Math.PI * 2) * ((i + 1) / 64);
			ctx.rotate(rotationAmount + spinAmount);
			ctx.translate(0, bar / 1.1);
			
			switch(drawStyle)
			{
				default:
				case "rect":
					ctx.fillRect(0, 0, BAR_WIDTH, barPerc);
					
					// stroke rects so they can be seen on any bg
					ctx.lineWidth = BAR_WIDTH / 4;
					ctx.strokeStyle = beamColors[fighter][0];
					ctx.strokeRect(0, 0, BAR_WIDTH, barPerc);
					break;
					
				case "line":
					ctx.moveTo(0,0)
					ctx.lineTo(0, barPerc);
					ctx.lineWidth = BAR_WIDTH / 3;
					ctx.closePath();
					ctx.stroke();
					break;
			}
			
			// poc lines
			ctx.lineWidth = 2;
			ctx.strokeStyle = beamColors[fighter][3];
			let start = i - 1 < 0 ? data[0] / 255 : data[i - 1] / 255;
			
			if(i == 0)
			{
				startPerc = percent;
				startVal = start;
			}
			
			ctx.beginPath();					
			ctx.bezierCurveTo(0, barPerc, 0, barPerc, BAR_WIDTH * (ballRadius * 0.04), bar * start);
			ctx.stroke();
			
			if(i == 63)
			{
				ctx.lineTo(0, bar * startPerc);
				ctx.stroke();
			}
			
			ctx.closePath();
			ctx.restore();
		}
		
		// make sure first ball is redrawn over bars
		balls[0].redraw();

		//Switching to waveform data
		analyserNode.getByteTimeDomainData(data);
		
		//Drawing bars around the center ball
		for (let i = 0; i < 64; i++)
		{
			let percent = data[i] / 255;
			percent = percent < .07 ? .07 : percent;
			
			ctx.save();
			ctx.globalAlpha = .5;
			
			ctx.fillStyle = beamColors[fighter][2];
			ctx.translate(balls[0].x, balls[0].y);		// behind center ball
			ctx.scale(1, -1);
			
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
			{
				data[i+2] = data[i+2] + 100;
			}

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
				data[i] = data[i+1] = data[i+2] = 128

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
				balls[i].redraw(ballRadius/2, ballLoc[i][0], ballLoc[i][1]);
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