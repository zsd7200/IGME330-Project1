var app = app || {}

app.utilities = (function () {
    //Helper function for getting Random number
    function random(min, max, arr)
    {   
		// get random int
        let num = Math.floor((Math.random() * max) + min);

		// if there is no array argument passed in, functions as a random int method
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

	//Helper function to get mouse location
	function getMouse(e){
		let mouse = {}
		mouse.x = e.pageX - e.target.offsetLeft;
		mouse.y = e.pageY - e.target.offsetTop;
		return mouse;
    }
	
	// helper function to handle gradient backgrounds
	function grad(ctx, topColor, bottomColor, loc = 300)
	{
		let grd = ctx.createLinearGradient(0, 0, 0, loc); // loc determines what y value to transition the color
		grd.addColorStop(0, topColor);
		grd.addColorStop(1, bottomColor);
		return grd;
	}
	
	// helper function to set up bgColors array
	function setBgColors(ctx)
	{		
		let tempColors = {
			"worldTournament" : grad(ctx, "#0D90BF", "#0b749a"),
			"namek" : grad(ctx, "#52ce73", "#efef9c", 500),
			"newPlanetVegeta" : grad(ctx, "#00106b", "#0084bd"),
			"iceField" : grad(ctx, "#734ad6", "#dec6f7", 600),
			"westCity" : grad(ctx, "#087bad", "#c6d6ce", 700),
			"field" : grad(ctx, "#a563de", "#fff7bd", 600)
		};
		return tempColors;
	}
	
	// handle setting beam position based on fighter pos
	function setBeamPos(left = 25, top = 488)
	{
		// beamPos[fighter][0] = x
		// beamPos[fighter][1] = y
		// width is changed based on time left in song
		// height is BEAM_HEIGHT
		let tempPos = {
			"goku" : [60 + left, 30 + top],
			"vegeta" : [60 + left, 20 + top],
			"teenGohan" : [55 + left, 35 + top],
			"futureTrunks" : [60 + left, 11 + top],
			"gotenks" : [53 + left, 36 + top],
			"android18" : [70 + left, 20 + top],
			"dad" : [62 + left, 37 + top],
			"cell" : [67 + left, 22 + top],
			"majinbuu" : [68 + left, 25 + top],
			"frieza" : [70 + left, 20 + top]				
		};
		
		return tempPos;
	}
	
	// helper function to update ballLoc array based on ballRadius
	function updateBallLoc(ballX, ballY, ballRadius)
	{		
		let tempLoc = [
			[ballX, ballY],
			[ballX + ballRadius * 1.75, ballY],
			[ballX - ballRadius * 1.75, ballY],
			[ballX + ballRadius * 1.25, ballY - ballRadius * 1.25],
			[ballX - ballRadius * 1.25, ballY - ballRadius * 1.25],
			[ballX + ballRadius * 1.25, ballY + ballRadius * 1.25],
			[ballX - ballRadius * 1.25, ballY + ballRadius * 1.25]
		];
		
		return tempLoc;
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
	
	//Change the audio effect of the song based on the selection from the dropdown
	function modifyAudio(filterType, biquadFilter, audioCtx)
	{
		//If there is no filter, take away the gain from the filter
		if(filterType == "none")
		{
			biquadFilter.type = "highshelf"; //Necessary so the filter correctly goes back to having no effects applied
			biquadFilter.frequency.setValueAtTime(0, audioCtx.currentTime);
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
		
    
    return{
        random,
        getMouse,
		grad,
		setBgColors,
		setBeamPos,
		updateBallLoc,
		requestFullscreen,
		modifyAudio
    }
})();