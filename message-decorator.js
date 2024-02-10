function getTasksList(tasks) {
    let strTasksList = tasks.filter(task => task.due_date > new Date() && task.active === 1)
        .map(task => `Task: ${task.name}\nDue date: ${task.due_date}\n`);
    console.log(strTasksList);
    return strTasksList.join("\n\n");
}

module.exports = { 
    getTasksList
};