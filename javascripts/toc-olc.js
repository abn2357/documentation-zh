function handleTocClick(event) {
  const checkbox = event.currentTarget.previousElementSibling;
  if (checkbox && checkbox.type === "checkbox") {
    // Custom logic here
    if (someCondition) {
      checkbox.checked = !checkbox.checked; // Toggle checkbox
    } else {
      event.preventDefault(); // Prevent default behavior
    }
  }
}
