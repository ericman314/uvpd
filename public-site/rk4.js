var RK4 = (function() {

  function add(v1, v2) {
    let v = v1.slice();
    for(let i=0; i<v.length; i++) {
      v[i] += v2[i];
    }
    return v;
  }

  function scale(v1, s) {
    let v = v1.slice();
    for(let i=0; i<v.length; i++) {
      v[i] *= s;
    }
    return v;
  }

  /**
   * Solves an initial value problem y' = f(t, y), y(t0) = y0. y can be a number or an array. f can return a number or an array.
   * @param {number} t0 Starting time
   * @param {number} tf Ending time
   * @param {Array} y0 Initial conditions 
   * @param {Function} f Function that takes as input, the current time t and value and variable(s) y. If y is a number, returns a number. If y is an array, should return an array.
   * @param {number} nsteps Number of timesteps
   * @param {Function} psc A function that returns a value. If the value changes sign, RK4 will stop the integration and attempt to include, as its final solution value, the precise point for which the value is 0.
   * @returns {Array} Evolution of y at each timestep from y(t0) through y(tf)
   */
  function solve(t0, tf, y0, f, nsteps, psc, _depth) {

    // Wrap initial conditions and function in an array
    const v_y0 = Array.isArray(y0) ? y0 : [y0]
    const v_f = Array.isArray(f(t0, v_y0)) ? f : function(x) { return [f(x)] }

    // Make sure initial conditions and function have same number of elements
    if(v_y0.length !== f(t0, v_y0).length) {
      throw new TypeError('Initial conditions and function must have same number of elements');
    }

    const i_nsteps = Math.round(nsteps);
    if(i_nsteps < 1) {
      throw new TypeError('nsteps must be positive');
    }

    if(tf <= t0) {
      throw new TypeError('tf must be greater than t0');
    }

    if(!psc) {
      psc = () => { return }
    }

    const h = (tf - t0) / i_nsteps;
    let v_y = v_y0.slice();
    const sol_ys = [];
    const psc0 = psc(t0, v_y0);
    sol_ys.push({ t: t0, y: v_y.slice(), psc: psc0 });

    for(let n=0; n < i_nsteps; n++) {
      let t = t0 + h * n
      
      let k1 = scale(v_f(t, v_y), h)
      let k2 = scale(v_f(t + h * 0.5, add(v_y, scale(k1, 0.5))), h)
      let k3 = scale(v_f(t + h * 0.5, add(v_y, scale(k2, 0.5))), h)
      let k4 = scale(v_f(t + h, add(v_y, k3)), h);

      v_y = add(add(add(add(v_y, scale(k1, 1/6)), scale(k2, 1/3)), scale(k3, 1/3)), scale(k4, 1/6))
      let _psc = psc(t+h, v_y);
      sol_ys.push({t: t+h, y: v_y, psc: _psc});
      if(Math.sign(_psc) !== Math.sign(psc0)) {
        break;
      }
    }

    if(typeof(psc0) !== 'undefined' && (_depth || 0) < 1) {
      // TODO: Interpolate between the two final solution points to find one for which psc === 0
      let pt0 = sol_ys[sol_ys.length-2];
      let pt1 = sol_ys[sol_ys.length-1];
      console.log(pt0);
      console.log(pt1);

      // Interpolate once
      let tfpredict = pt0.t + (pt1.t-pt0.t) * (-pt0.psc/(pt1.psc-pt0.psc));
      console.log(tfpredict);

      // Perform one step of RK4
      var nextStep = solve(pt0.t, tfpredict, pt0.y, v_f, 1, psc, (_depth || 0) + 1)
      
      // This is probably close enough for most purposes (although you could quickly turn this into a recursive secant method!) so we'll stop here
      sol_ys[sol_ys.length-1] = nextStep[1];      
    }
  
    return sol_ys;
  }

  return {
    solve: solve
  }

})();