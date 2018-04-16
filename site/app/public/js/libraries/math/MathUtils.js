var WIRE_DIST_THRESHOLD2 = require("../Constants").WIRE_DIST_THRESHOLD2;

var V = require("./Vector").V;

/**
 * Determines whether the given point is
 * within the rectangle defined by the
 * given transform
 *
 * @param  {Transform} transform
 *         The transform that represents the rectangle
 *
 * @param  {Vector} pos
 *         * Must be in world coordinates *
 *         The point to determine whether or not
 *         it's within the rectangle
 *
 * @return {Boolean}
 *         True if the point is within the rectangle,
 *         false otherwise
 */
function RectContains(transform, pos) {
    var tr = transform.size.scale(0.5);
    var bl = transform.size.scale(-0.5);
    var p  = transform.toLocalSpace(pos);

    return (p.x > bl.x &&
            p.y > bl.y &&
            p.x < tr.x &&
            p.y < tr.y);
}

/**
 * Determines whether the given point
 * is within the circle defined by the
 * given transform
 *
 * @param  {Transform} transform
 *         The transform that represents the circle
 *
 * @param  {Vector} pos
 *         * Must be in world coordinates *
 *         The point to determine whether or not
 *         it's within the rectangle
 *
 * @return {Boolean}
 *          True if the point is within the rectangle,
 *          false otherwise
 */
function CircleContains(transform, pos) {
    var v = transform.toLocalSpace(pos);
    return (v.len2() <= transform.size.x*transform.size.x/4);
}

/**
 * Compares two transforms to see if they overlap.
 * First tests it using a quick circle-circle
 * intersection using the 'radius' of the transform
 *
 * Then uses a SAT (Separating Axis Theorem) method
 * to determine whether or not the two transforms
 * are intersecting
 *
 * @param  {Transform} a
 *         The first transform
 *
 * @param  {Transform} b
 *         The second transform
 *
 * @return {Boolean}
 *         True if the two transforms are overlapping,
 *         false otherwise
 */
function TransformContains(A, B) {
    // If both transforms are non-rotated
    if (Math.abs(A.getAngle()) <= 1e-5 && Math.abs(B.getAngle()) <= 1e-5) {
        var aPos = A.getPos(), aSize = A.getSize();
        var bPos = B.getPos(), bSize = B.getSize();
        return (Math.abs(aPos.x - bPos.x) * 2 < (aSize.x + bSize.x)) &&
               (Math.abs(aPos.y - bPos.y) * 2 < (aSize.y + bSize.y));
    }

    // Quick check circle-circle intersection
    var r1 = A.getRadius();
    var r2 = B.getRadius();
    var sr = r1 + r2;                       // Sum of radius
    var dpos = A.getPos().sub(B.getPos());  // Delta position
    if (dpos.dot(dpos) > sr*sr)
        return false;

    /* Perform SAT */

    // Get corners in local space of transform A
    var a = A.getLocalCorners();

    // Transform B's corners into A local space
    var bworld = B.getCorners();
    var b = [];
    for (var i = 0; i < 4; i++) {
        b[i] = A.toLocalSpace(bworld[i]);

        // Offsets x and y to fix perfect lines
        // where b[0] = b[1] & b[2] = b[3]
        b[i].x += 0.0001*i;
        b[i].y += 0.0001*i;
    }

    var corners = a.concat(b);

    var minA, maxA, minB, maxB;

    // SAT w/ x-axis
    // Axis is <1, 0>
    // So dot product is just the x-value
    minA = maxA = corners[0].x;
    minB = maxB = corners[4].x;
    for (var j = 1; j < 4; j++) {
        minA = Math.min(corners[j].x, minA);
        maxA = Math.max(corners[j].x, maxA);
        minB = Math.min(corners[j+4].x, minB);
        maxB = Math.max(corners[j+4].x, maxB);
    }
    if (maxA < minB || maxB < minA)
        return false;

    // SAT w/ y-axis
    // Axis is <1, 0>
    // So dot product is just the y-value
    minA = maxA = corners[0].y;
    minB = maxB = corners[4].y;
    for (var j = 1; j < 4; j++) {
        minA = Math.min(corners[j].y, minA);
        maxA = Math.max(corners[j].y, maxA);
        minB = Math.min(corners[j+4].y, minB);
        maxB = Math.max(corners[j+4].y, maxB);
    }
    if (maxA < minB || maxB < minA)
        return false;

    // SAT w/ other two axes
    var normals = [b[3].sub(b[0]), b[3].sub(b[2])];
    for (var i = 0; i < normals.length; i++) {
        var normal = normals[i];
        var minA = undefined, maxA = undefined;
        var minB = undefined, maxB = undefined;
        for (var j = 0; j < 4; j++) {
            var s = corners[j].dot(normal);
            minA = Math.min(s, (minA ? minA :  Infinity));
            maxA = Math.max(s, (maxA ? maxA : -Infinity));
            var s2 = corners[j+4].dot(normal);
            minB = Math.min(s2, (minB ? minB :  Infinity));
            maxB = Math.max(s2, (maxB ? maxB : -Infinity));
        }
        if (maxA < minB || maxB < minA)
            return false;
    }

    return true;
}

/**
 * Returns the nearest point on the edge
 * of the given rectangle.
 *
 * @param  {Vector} bl
 *         Bottom left corner of the rectangle
 *
 * @param  {Vector} tr
 *         Top right corner of the rectangle
 *
 * @param  {Vector} pos
 *         The position to get the nearest point on
 *
 * @return {Vector}
 *         The closest position on the edge of
 *         the rectangle from 'pos'
 */
function GetNearestPointOnRect(bl, tr, pos) {
    if (pos.x < bl.x)
        return V(bl.x, Clamp(pos.y, bl.y, tr.y));
    if (pos.x > tr.x)
        return V(tr.x, Clamp(pos.y, bl.y, tr.y));
    if (pos.y < bl.y)
        return V(Clamp(pos.x, bl.x, tr.x), bl.y);
    if (pos.y > tr.y)
        return V(Clamp(pos.x, bl.x, tr.x), tr.y);
    return V(0, 0);
}

/**
 * Clamps a number between a given min and max
 *
 * @param  {Number} x
 *         The number to Clamp
 *
 * @param  {Number} min
 *         The minimum
 *
 * @param  {Number} max
 *         The maximum
 *
 * @return {Number}
 *         The Clamped number
 */
function Clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
}

/**
 * Uses Newton's method to find the roots of
 * the function 'f' given a derivative 'df'
 *
 * @param  {Number} iterations
 *         The number of iterations to perform
 *         Newton's method with; the smaller
 *         the better but less accurate
 *
 * @param  {Number} t0
 *         The starting root value parameter
 *
 * @param  {Number} x
 *         Parameter 1 for the function
 *
 * @param  {Number} y
 *         Parameter 2 for the function
 *
 * @param  {Function} f
 *         The function to find the roots of
 *         In the form f(t, x, y) = ...
 *
 * @param  {Function} df
 *         The derivative of the function
 *         In the form of df(t, x, y)
 *
 * @return {Number}
 *         The parameter 't' that results in
 *         f(t, x, y) = 0
 */
function FindRoots(iterations, t0, x, y, f, df) {
    var t = t0;
    do {
        var v = f(t, x, y);
        var dv = df(t, x, y);
        if (dv === 0)
            break;
        t = t - v / dv;
        t = Clamp(t, 0.01, 0.99);
    } while((iterations--) > 0);
    return t;
}

/**
 * Finds and returns the closest 't' value
 * of the parametric equation for a line.
 *
 * Parametric function defined by
 * X(t) = t(p2.x - p1.x) + p1.x
 * Y(t) = t(p2.y - p1.y) + p1.y
 *
 * Solves for 't' from root of the derivative of
 * the distance function between the line and <mx, my>
 * D(t) = sqrt((X(t) - mx)^2 + (Y(t) - my)^2)
 *
 * @param  {Vector} p1
 *         The first point of the line
 *
 * @param  {Vector} p2
 *         The second point of the line
 *
 * @param  {Number} mx
 *         The x-value of the point
 *         to determine the 't' value
 *
 * @param  {Number} my
 *         The y-value of the point
 *         to determine the 't' value
 *
 * @return {Number}
 *         The nearest 't' value of <mx, my>
 *         on the line p1->p2 or -1 if the
 *         dist < WIRE_DIST_THRESHOLD
 */
function GetNearestT(p1, p2, mx, my) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var t = (dx*(mx - p1.x) + dy*(my - p1.y))/(dx*dx + dy*dy);
    t = Clamp(t, 0, 1);
    var pos = V(dx * t + p1.x, dy * t + p1.y);
    if (pos.sub(V(mx, my)).len2() < WIRE_DIST_THRESHOLD2)
        return t;
    else
        return -1;
}


module.exports.CircleContains = CircleContains;
module.exports.RectContains = RectContains;
module.exports.TransformContains = TransformContains;
module.exports.GetNearestPointOnRect = GetNearestPointOnRect;
module.exports.Clamp = Clamp;
module.exports.FindRoots = FindRoots;