const powerBtn = document.querySelector('.power-button');
const powerLight = document.querySelector('.power-light');
const screen = document.querySelector('iframe');

screen.style.display = 'none';

powerBtn.addEventListener('click', () => {
	if(screen.style.display == 'none'){
		screen.style.display = 'block';
		powerLight.style.background = '#ffb800';
		powerLight.style.boxShadow = '0px 0px 16px #ffb800';
		setTimeout(()=>{
			document.querySelector('iframe').click();
		}, 1000)
	} else {
		screen.style.display = 'none';
		powerLight.style.background = '#333';
		powerLight.style.boxShadow = 'none';
	}
});

// Get the canvas element and its drawing context
document.addEventListener('DOMContentLoaded', function() {
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
	
	// Set up canvas text properties
	ctx.fillStyle = 'white';
	ctx.font = '20px Arial';
	ctx.textAlign = 'center';
	
	// Draw test text on the canvas
	ctx.fillText('Game Boy Advance SP Canvas Test', canvas.width/2, canvas.height/2);
});