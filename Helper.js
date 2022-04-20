
handleWrongParams = (res, ...args) => {
    let out = '';
    for(let values of args){
        out += values + " is required in param"
    }
    res.json({error : out})
}
handleFindError = (res, err, data) => {
    if (err) {
        res.status(500).json({"error": "Internal Server Error", "body": err.toString()})
    } else if (!data) {
        res.status(404).json({"error": "Not Found or Empty"})
    } else {
        res.status(200).json(data);
    }
}
module.exports.handleFindError = handleFindError
module.exports.handleWrongParams = handleWrongParams;
