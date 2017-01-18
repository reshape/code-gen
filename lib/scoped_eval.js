// When you run an eval, it has access to all of the variables in any parent
// scope, which means the entire file. So running an eval inside the main file
// means that if the user references the name of a variable that also exists
// within the main file, it will pull in that variable from the source, which is
// a mess. For this reason, we run the eval in a clean module with minimal
// potential conflicting variables available.

module.exports = (__reshapeContext, __reshapeFnString) => {
  return eval(__reshapeFnString) // eslint-disable-line
}
