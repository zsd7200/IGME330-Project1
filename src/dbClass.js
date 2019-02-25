class DragonBall {
	
	// setup variables and draw the ball
	constructor(ctx, x, y, rad, stars = 4, maxBar = (rad * 1.1), lineWidth = (rad * .06))
	{
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		this.rad = rad;
		this.stars = stars;
		this.maxBar = maxBar;
		this.lineWidth = lineWidth;
		drawBall(this.ctx, this.x, this.y, this.rad, this.stars, this.maxBar, this.lineWidth);
	}
	
	// redraw method for when radius is resized
	redraw(rad = this.rad, x = this.x, y = this.y, ctx = this.ctx)
	{
		this.x = x;
		this.y = y;
		this.rad = rad;
		this.maxBar = (rad * 1.1);
		this.lineWidth = (rad * .06);
		drawBall(this.ctx, this.x, this.y, this.rad, this.stars, this.maxBar, this.lineWidth);
	}
}

	// draw a star based on a single point
	function drawStar(ctx, cpX, cpY, lngt, fillStyle = "red")
	{
		// move Y so the user input is closer to center point
		cpY += lngt * .6;
		
		ctx.save();
		ctx.fillStyle = fillStyle;
		
		// start first tri
		ctx.beginPath();
		ctx.moveTo(cpX, cpY);
		ctx.lineTo(cpX, cpY - (lngt * 2));
		ctx.lineTo(cpX - lngt, cpY + (lngt * .7));
		ctx.closePath();
		ctx.fill();
		
		// second tri
		ctx.beginPath();
		ctx.moveTo(cpX, cpY);
		ctx.lineTo(cpX, cpY - (lngt * 2));
		ctx.lineTo(cpX + lngt, cpY + (lngt * .7));
		ctx.closePath();
		ctx.fill();
		
		// third and final tri
		ctx.beginPath();
		ctx.moveTo(cpX, cpY);
		ctx.lineTo(cpX - (lngt + (lngt/2)), cpY - lngt);
		ctx.lineTo(cpX + (lngt + (lngt/2)), cpY - lngt);
		ctx.closePath();
		ctx.fill();
		
		// fill in little remaining bit of transparency
		ctx.strokeStyle = fillStyle;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cpX, cpY);
		ctx.lineTo(cpX, cpY - (lngt * 2) + (lngt / 3.75));
		ctx.closePath();
		ctx.stroke();

		// restore original context values
		ctx.restore();
	}
	
	// draws the dragon ball
	function drawBall(ctx, x, y, rad, stars = 4, maxBar = (rad * 1.1), lineWidth = (rad * .06))
	{	
		ctx.save();
		
		// set styles
		ctx.fillStyle = "yellow";
		ctx.strokeStyle = "black";
		ctx.lineWidth = lineWidth;
		
		// draw orb
		ctx.beginPath();
		ctx.arc(x, y, rad, 0, Math.PI * 2, false);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		
		// draw inner orb
		// https://stackoverflow.com/questions/5475755/how-to-draw-a-blurry-circle-on-html5-canvas
		let orangeGrad = ctx.createRadialGradient(x,y,0,x,y,rad);
		orangeGrad.addColorStop(0, "rgba(255, 165, 0, 1)");
		orangeGrad.addColorStop(0.8, "rgba(228, 192, 0, .9)");
		orangeGrad.addColorStop(1, "rgba(228, 192, 0, 0)");
		
		ctx.fillStyle = orangeGrad;
		ctx.fillRect(x - rad, y - rad, x + rad, y + rad);
		
		// add in stars to correct positions
		switch(stars)
		{
			case 1:
				drawStar(ctx, x, y, rad / 8);
				break;
				
			case 2:
				drawStar(ctx, x - rad/5, y - rad/5, rad/8);
				drawStar(ctx, x + rad/5, y + rad/5, rad/8)
				break;
				
			case 3:
				drawStar(ctx, x, y - rad/4, rad/8);
				drawStar(ctx, x - rad/4, y + rad/5, rad/8);
				drawStar(ctx, x + rad/4, y + rad/5, rad/8);
				break;
				
			case 4:
			default:
				drawStar(ctx, x - rad/2.5, y - rad/4, rad/8);
				drawStar(ctx, x + rad/5, y - rad/4, rad/8);
				drawStar(ctx, x - rad/4.5, y + rad/4, rad/8);
				drawStar(ctx, x + rad/2.5, y + rad/4, rad/8);
				break;
				
			case 5:
				drawStar(ctx, x, y - rad/2.5, rad/8);
				drawStar(ctx, x - rad/2.5, y - rad/8, rad/8);
				drawStar(ctx, x + rad/2.5, y - rad/8, rad/8);
				drawStar(ctx, x - rad/4, y + rad/3, rad/8);
				drawStar(ctx, x + rad/4, y + rad/3, rad/8);
				break;
				
			case 6:
				drawStar(ctx, x, y, rad/8);
				drawStar(ctx, x, y - rad/2.5, rad/8);
				drawStar(ctx, x - rad/2.5, y - rad/8, rad/8);
				drawStar(ctx, x + rad/2.5, y - rad/8, rad/8);
				drawStar(ctx, x - rad/4, y + rad/3, rad/8);
				drawStar(ctx, x + rad/4, y + rad/3, rad/8);
				break;
				
			case 7:
				drawStar(ctx, x, y, rad/8);
				drawStar(ctx, x - rad/2, y, rad/8);
				drawStar(ctx, x + rad/2, y, rad/8);
				drawStar(ctx, x - rad/4, y - rad/3, rad/8);
				drawStar(ctx, x + rad/4, y - rad/3, rad/8);
				drawStar(ctx, x - rad/4, y + rad/3, rad/8);
				drawStar(ctx, x + rad/4, y + rad/3, rad/8);
				break;
		}

		// add white circle in top left for shading
		let whiteGrad = ctx.createRadialGradient(x - rad/2, y - rad/2, 0, x - rad/4, y - rad/4, rad / 2);
		whiteGrad.addColorStop(0, "rgba(255, 255, 255, .5)");
		whiteGrad.addColorStop(0.8, "rgba(228, 228, 228, .3)");
		whiteGrad.addColorStop(1, "rgba(228, 228, 228, 0)");
		
		ctx.fillStyle = whiteGrad;
		ctx.fillRect(x - rad, y - rad, x + rad, y + rad);

		// restore ctx data
		ctx.restore();
	}