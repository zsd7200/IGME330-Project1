var app = app || {}

app.utilities = (function () {
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
    	
	

	//Helper function to get mouse location
	function getMouse(e){
		let mouse = {}
		mouse.x = e.pageX - e.target.offsetLeft;
		mouse.y = e.pageY - e.target.offsetTop;
		console.log(mouse.x + " " + mouse.y);
		return mouse;
    }
    
    return{
        random,
        getMouse
    }
})();