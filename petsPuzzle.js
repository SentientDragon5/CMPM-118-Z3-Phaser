import { init } from 'z3-solver';

const { Context } = await init();
const { Solver, Int, And, Or, Distinct } = new Context("main");

const solver = new Solver();

// int : 0 is cat, 1 dog, 2 bird, 3 fish

const b = Int.const('b');  // x is a Z3 integer
const m = Int.const('m');
const c = Int.const('c');
const s = Int.const('s');

solver.add(And(b.eq(1), m.eq(0), c.eq(2)));
solver.add(Distinct(b,m,c,s))

// Run Z3 solver, find solution and sat/unsat

if (await solver.check() === "sat") {

    // Extract value for x
    let model = solver.model();
    console.log("0 is cat, 1 dog, 2 bird, 3 fish")
    console.log("Bob: ", model.eval(b).toString())
    console.log("Mary: ", model.eval(m).toString())
    console.log("Cathy: ", model.eval(c).toString())
    console.log("Sue: ", model.eval(s).toString())


} else {

    console.log("unsat. Could not find a valid value for x.");

}