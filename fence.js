import { init } from 'z3-solver';

const { Context } = await init();
const { Solver, Int, And, Or, Distinct } = new Context("main");

const solver = new Solver();

// if there were previous problems
solver.reset();

var x = Int.const('x');  // x is a Z3 integer
var y = Int.const('y')

solver.add(And(x.gt(5), x.lt(10), y.gt(15), y.lt(25)));

if (await solver.check() === "sat") {
    let model = solver.model();
    console.log("A spot within the fence is: ",  model.eval(x).toString(), ",", model.eval(y).toString())
} else {
    console.log("unsat. Could not find a valid value for x.");
}

solver.reset();

x = Int.const('x');  // x is a Z3 integer
y = Int.const('y')

solver.add(And(Or(x.lt(5), x.gt(10)), Or(y.lt(15), y.gt(25))));

if (await solver.check() === "sat") {
    let model = solver.model();
    console.log("A spot within the fence is: ",  model.eval(x).toString(), ",", model.eval(y).toString())
} else {
    console.log("unsat. Could not find a valid value for x.");
}