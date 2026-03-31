//PROFILE FORM
const editBtn = document.getElementById('editProfileBtn');
const form = document.getElementById('profileForm');
const inputs = document.querySelectorAll('#profileForm input');

let editing = false;

editBtn.addEventListener('click', () => {
    if (!editing) {
        //Enable editing
        inputs.forEach(input => input.disabled = false);
        editBtn.textContent = 'Save Changes';
        editing = true;
    } else {
        //Submit form
        form.submit();
    }
});