//PROFILE FORM
const editBtn = document.getElementById('editProfileBtn');
const inputs = document.querySelectorAll('#profileForm input');

editBtn.addEventListener('click', () => {
    inputs.forEach(input => input.disabled = !input.disabled); // toggle editable
    editBtn.textContent = inputs[0].disabled ? 'Update Profile' : 'Save Changes';
});