const textfield = document.querySelector('.tweet-box-textarea');
const button = document.querySelector('.send .btn');
const progress = document.querySelector('div[role="progressbar"]');
const maxCharacters = 280;


if (textfield) textfield.addEventListener('input', () => {
    // Automatically increases height of the text field to fit content
    textfield.style.height = "auto";
    textfield.style.height = textfield.scrollHeight + "px";

    // Converts character number to percentage
    progressBarPercentage = textfield.value.length / maxCharacters * 100;

    // Enables the buttons and the visibility of the progress ring if there's content on the text field 
    button.disabled = !textfield.value || textfield.value.length > maxCharacters;
    progress.style.visibility = !textfield.value ? "hidden" : "visible";

    // Updates the progress bar as the percentage changes
    progress.style.setProperty('--value', progressBarPercentage);

    // Warns the user when they're near or past the character limit   
    if (progressBarPercentage > 90) {
        progress.innerHTML = maxCharacters - textfield.value.length;
        progress.style.setProperty('--fg', progressBarPercentage >= 100 ? '#F4212E' : '#FFD400');
        progress.style.setProperty('--size', '2rem');
    }

    // Changes it back. There might be a more elegant solution
    // TODO
    else {
        progress.innerHTML = '';
        progress.style.setProperty('--fg', 'rgb(29 161 242)');
        progress.style.setProperty('--size', '1.3rem');
    }

});

// Checking for images over the limit and dictating they should be
const frames = document.querySelectorAll('.tweet .media');
const maxHeight = 400;
frames.forEach(frame => {
    var image = frame.firstChild;
    if (!image.complete) {
        frame.remove();
    }


    frame.style.maxHeight = maxHeight + 'px';
    if (image.height > maxHeight && image.height > image.width) {
        frame.style.width = '75%';
        image.style.bottom = (image.height - maxHeight) / 2 + 'px';
    }
});

// Time conversion from millisecond to string

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

function formatTime(millisecondInput) {
    var diff = Date.now() - millisecondInput
    if (diff > day) {
        const date = new Date(millisecondInput / 1000);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } else if (diff > hour) {
        return Math.floor(diff / hour) + "h";
    } else if (diff > minute) {
        return Math.floor(diff / minute) + "m";
    }
    return Math.floor(diff / second) + "s";
}


const times = document.querySelectorAll('.timesince');
times.forEach(time => time.innerHTML = formatTime(time.innerHTML))


const likeButtons = document.querySelectorAll('.like.btn');
likeButtons.forEach(button => {



    button.addEventListener('click', async () => {
        const likeCount = parseInt(button.querySelector('.like-count').innerHTML, 10);
        const active = parseInt(button.getAttribute('active'), 10);
        const postId = button.getAttribute('postId');
        if (active) {
            // Dislike
            button.setAttribute('active', 0);
            button.querySelector('.like-count').innerHTML = likeCount - 1;
            button.setAttribute('class', 'like btn row');

        } else {
            // Like
            button.setAttribute('active', 1);
            button.querySelector('.like-count').innerHTML = likeCount + 1;
            button.setAttribute('class', 'like btn row active');
        }


        const rawResponse = await fetch('/like', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active: active, postId: postId })
        });
        const content = await rawResponse.json();

    })



})

// handle floating form

const fields = document.querySelectorAll('.field')
const loginButton = document.querySelector('.login-card .login .btn');

fields.forEach(field => {

    const form = field.querySelector('.form-control')
    const formLabel = field.querySelector('.form-floating label')

    if (form && form.value) {
        formLabel.setAttribute('class', 'active secondary');
        form.setAttribute('class', 'form-control active');
    }

    if (form) form.addEventListener('input', () => {
        // Disable login button if all fields are empty
        loginButton.disabled = !Object.values(fields).every(x => x.querySelector('input').value)
    });

    if (form) form.addEventListener('focusin', () => {
        formLabel.setAttribute('class', 'active secondary');
        form.setAttribute('class', 'form-control active');
    });
    if (form) form.addEventListener('blur', () => {
        formLabel.setAttribute('class', !form.value ? '' : 'active secondary');
        form.setAttribute('class', !form.value ? 'form-control' : 'form-control active ');
    });
});







// Only shows content after everything is loaded
// TODO: Add loading screen
document.querySelector('body').style.visibility = 'visible'