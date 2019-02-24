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
        addEffects,
        redrawAll
    }
})();