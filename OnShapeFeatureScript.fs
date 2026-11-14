FeatureScript 2411;
import(path : "onshape/std/common.fs", version : "2411.0");

// Helper function to read variables from your Part Studio Variable Table
function getVar(context is Context, name is string, defaultVal is ValueWithUnits) returns ValueWithUnits
{
    try silent
    {
        return getVariable(context, name);
    }
    catch
    {
        return defaultVal;
    }
}


// =========================================================================
// PART 1: Horizontal-Split L-Clamp (Dorsal Bolt Raised +4mm for Max Part 1A Strength)
// =========================================================================
annotation { "Feature Type Name" : "OnStage L-Clamp" }
export const onStageLClamp = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var tubeSize  = getVar(context, "tube_size", 30.5 * millimeter);
        var tubeRad   = getVar(context, "tube_rad", 3.5 * millimeter);
        var clampGap  = getVar(context, "clamp_gap", 2.0 * millimeter);
        var m4Clear   = getVar(context, "m4_clear", 4.4 * millimeter);
        var m4Nut     = getVar(context, "m4_nut", 7.4 * millimeter);
        var m4Head    = getVar(context, "m4_head", 7.6 * millimeter);
        var pegSize   = getVar(context, "peg_size", 20.0 * millimeter);
        var backReach = getVar(context, "back_reach", 155.0 * millimeter);

        var halfTube = tubeSize / 2;                // 15.25mm
        var topZ     = halfTube + (8 * millimeter); // +23.25mm
        var botZ     = -35 * millimeter;             // -35.00mm

        // Peg center is at Y = 15.25 + 155 + 12.5 = 182.75mm
        var pegCenterY  = halfTube + backReach + (12.5 * millimeter);
        var armExtension = 10.0 * millimeter;
        var armEndY     = halfTube + backReach + (25.0 * millimeter) + armExtension; // 205.25mm
        var seatFrontY  = pegCenterY - (15.0 * millimeter); // 167.75mm (Front edge of 40x30mm riser footprint)
        var spineBoltY  = seatFrontY - (20.0 * millimeter); // 147.75mm (20mm in front of riser footprint)

        // 1. Solid 90mm Wide Clamp Block
        fCuboid(context, id + "clampBlock", {
                "corner1" : vector(-45 * millimeter, -30 * millimeter, botZ),
                "corner2" : vector( 45 * millimeter,  30 * millimeter, topZ)
        });

        opFillet(context, id + "filletClampOuter", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "clampBlock", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 4 * millimeter
        });

        // 2. Profiled Extension Arm (Part 1B) with Swept Curved Bottom Keel
        var armProfileSk = newSketchOnPlane(context, id + "armProfileSk", {
                "sketchPlane" : plane(vector(-25 * millimeter, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var curveStartY = armEndY - (45 * millimeter);
        var a1 = vector(20 * millimeter, botZ);
        var a2 = vector(curveStartY,   botZ);
        var a3 = vector(armEndY,       10 * millimeter);
        var a4 = vector(20 * millimeter, 10 * millimeter);

        var aMid = vector(curveStartY + (31 * millimeter), botZ + (13 * millimeter));

        skLineSegment(armProfileSk, "aBottomFlat",  { "start" : a1, "end" : a2 });
        skArc(armProfileSk,         "aBottomSweep", { "start" : a2, "mid" : aMid, "end" : a3 });
        skLineSegment(armProfileSk, "aTopFlat",     { "start" : a3, "end" : a4 });
        skLineSegment(armProfileSk, "aFrontClose",  { "start" : a4, "end" : a1 });
        skSolve(armProfileSk);

        opExtrude(context, id + "extArm", {
                "entities" : qSketchRegion(id + "armProfileSk"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : 50 * millimeter
        });

        var armBody  = qCreatedBy(id + "extArm", EntityType.BODY);
        var armEdges = qOwnedByBody(armBody, EntityType.EDGE);

        // 2A. Fillet Arm Longitudinal Edges, Curved Keel, and Rear Top Edge
        var topLongEdges = qUnion([
                qContainsPoint(armEdges, vector(-25 * millimeter, 50 * millimeter, 10 * millimeter)),
                qContainsPoint(armEdges, vector( 25 * millimeter, 50 * millimeter, 10 * millimeter))
        ]);
        var botFlatEdges = qUnion([
                qContainsPoint(armEdges, vector(-25 * millimeter, 50 * millimeter, botZ)),
                qContainsPoint(armEdges, vector( 25 * millimeter, 50 * millimeter, botZ))
        ]);
        var keelArcEdges = qUnion([
                qContainsPoint(armEdges, vector(-25 * millimeter, aMid[0], aMid[1])),
                qContainsPoint(armEdges, vector( 25 * millimeter, aMid[0], aMid[1]))
        ]);
        var rearTopEdge = qContainsPoint(armEdges, vector(0 * millimeter, armEndY, 10 * millimeter));

        opFillet(context, id + "filletArmContours", {
                "entities" : qUnion([
                        topLongEdges,
                        botFlatEdges,
                        keelArcEdges,
                        rearTopEdge
                ]),
                "radius" : 5 * millimeter
        });

        // 2B. Central Dorsal Tension Spine on Part 1A (Y = 20mm to seatFrontY, Z = 11mm to topZ)
        var spineBotZ = 10 * millimeter + (clampGap / 2); // +11.00mm
        fCuboid(context, id + "armSpine", {
                "corner1" : vector(-10 * millimeter, 20 * millimeter, spineBotZ),
                "corner2" : vector( 10 * millimeter, seatFrontY,    topZ)
        });
        var spineBody  = qCreatedBy(id + "armSpine", EntityType.BODY);
        var spineEdges = qOwnedByBody(spineBody, EntityType.EDGE);

        opFillet(context, id + "filletSpine", {
                "entities" : qUnion([
                        qContainsPoint(spineEdges, vector(-10 * millimeter, 100 * millimeter, topZ)), // moved to top of spine
                        qContainsPoint(spineEdges, vector( 10 * millimeter, 100 * millimeter, topZ)), // moved to top of spine
                        qContainsPoint(spineEdges, vector(-10 * millimeter, seatFrontY,     topZ)),
                        qContainsPoint(spineEdges, vector( 10 * millimeter, seatFrontY,     topZ))
                ]),
                "radius" : 10 * millimeter
        });

        // 3. Solid Upward Riser Peg at the Rear End of the Arm
        fCuboid(context, id + "riserPeg", {
                "corner1" : vector(-pegSize / 2, pegCenterY - pegSize / 2, 10 * millimeter),
                "corner2" : vector( pegSize / 2, pegCenterY + pegSize / 2, 40 * millimeter)
        });

        opBoolean(context, id + "unionBody", {
                "tools" : qUnion([
                        qCreatedBy(id + "clampBlock", EntityType.BODY),
                        armBody,
                        spineBody,
                        qCreatedBy(id + "riserPeg", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 4. Cut Rounded Square Tube Profile along X-axis
        var tubeSketch = newSketchOnPlane(context, id + "tubeSketch", {
                "sketchPlane" : plane(vector(-50 * millimeter, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var h = halfTube;
        var r = tubeRad;
        var c = h - r;
        var k = r * cos(45 * degree);

        skLineSegment(tubeSketch, "top",    { "start" : vector(-c,  h), "end" : vector( c,  h) });
        skLineSegment(tubeSketch, "bottom", { "start" : vector(-c, -h), "end" : vector( c, -h) });
        skLineSegment(tubeSketch, "left",   { "start" : vector(-h, -c), "end" : vector(-h,  c) });
        skLineSegment(tubeSketch, "right",  { "start" : vector( h, -c), "end" : vector( h,  c) });

        skArc(tubeSketch, "arcTR", { "start" : vector( c,  h), "mid" : vector( c + k,  c + k), "end" : vector( h,  c) });
        skArc(tubeSketch, "arcTL", { "start" : vector(-h,  c), "mid" : vector(-c - k,  c + k), "end" : vector(-c,  h) });
        skArc(tubeSketch, "arcBL", { "start" : vector(-c, -h), "mid" : vector(-c - k, -c - k), "end" : vector(-h, -c) });
        skArc(tubeSketch, "arcBR", { "start" : vector( h, -c), "mid" : vector( c + k, -c - k), "end" : vector( c, -h) });
        skSolve(tubeSketch);

        opExtrude(context, id + "extTube", {
                "entities" : qSketchRegion(id + "tubeSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : 100 * millimeter
        });

        // 5A. Horizontal Compression Gap at Z = 0mm
        fCuboid(context, id + "gapToolHoriz", {
                "corner1" : vector(-50 * millimeter, -35 * millimeter, -clampGap / 2),
                "corner2" : vector( 50 * millimeter,  35 * millimeter,  clampGap / 2)
        });

        // 5B. Split Part 1A from Part 1B
        fCuboid(context, id + "armClearanceCut", {
                "corner1" : vector(-25 * millimeter - (clampGap / 2), 20 * millimeter - clampGap, -clampGap / 2),
                "corner2" : vector( 25 * millimeter + (clampGap / 2), 35 * millimeter,             spineBotZ)
        });

        // 6. Four Corner Clamping Bolts + 5th Raised Dorsal Spine Anchor Bolt
        var boltTools = [];

        // --- 6A. Main 4 Corner Clamp Bolts ---
        var cornerCoords = [
            vector(-35 * millimeter, -22.5 * millimeter, 0 * millimeter),
            vector( 35 * millimeter, -22.5 * millimeter, 0 * millimeter),
            vector(-35 * millimeter,  22.5 * millimeter, 0 * millimeter),
            vector( 35 * millimeter,  22.5 * millimeter, 0 * millimeter)
        ];

        var headSeatZMain = topZ - (9.25 * millimeter); // +14.00mm
        var nutRoofZMain  = -11 * millimeter;
        var nutSlotH       = 2.8 * millimeter;
        var nutFloorZMain = nutRoofZMain - nutSlotH; // -13.80mm

        var mainNutSk = newSketchOnPlane(context, id + "mainNutSk", {
                "sketchPlane" : plane(vector(0 * millimeter, 0 * millimeter, nutFloorZMain), vector(0, 0, 1), vector(1, 0, 0))
        });

        var idx = 0;
        for (var pt in cornerCoords)
        {
            idx += 1;
            var bx = pt[0];
            var by = pt[1];

            fCylinder(context, id + ("holeCyl" ~ idx), {
                    "bottomCenter" : vector(bx, by, -26 * millimeter),
                    "topCenter"    : vector(bx, by,  30 * millimeter),
                    "radius"       : m4Clear / 2
            });
            boltTools = append(boltTools, qCreatedBy(id + ("holeCyl" ~ idx), EntityType.BODY));

            fCylinder(context, id + ("headCyl" ~ idx), {
                    "bottomCenter" : vector(bx, by, headSeatZMain),
                    "topCenter"    : vector(bx, by, 30 * millimeter),
                    "radius"       : m4Head / 2
            });
            boltTools = append(boltTools, qCreatedBy(id + ("headCyl" ~ idx), EntityType.BODY));

            var nutPt = vector(bx, by);
            skRegularPolygon(mainNutSk, "nut" ~ idx, {
                    "center" : nutPt,
                    "firstVertex" : nutPt + vector(m4Nut / (2 * cos(30 * degree)), 0 * millimeter),
                    "sides" : 6
            });

            var xOuter = (bx < 0 * millimeter) ? (-50 * millimeter) : (50 * millimeter);
            var xMin   = (bx < 0 * millimeter) ? xOuter : bx;
            var xMax   = (bx < 0 * millimeter) ? bx : xOuter;

            fCuboid(context, id + ("sideSlot" ~ idx), {
                    "corner1" : vector(xMin, by - (m4Nut / 2), nutFloorZMain),
                    "corner2" : vector(xMax, by + (m4Nut / 2), nutRoofZMain)
            });
            boltTools = append(boltTools, qCreatedBy(id + ("sideSlot" ~ idx), EntityType.BODY));
        }
        skSolve(mainNutSk);

        opExtrude(context, id + "extMainNuts", {
                "entities" : qSketchRegion(id + "mainNutSk"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : nutSlotH
        });
        boltTools = append(boltTools, qCreatedBy(id + "extMainNuts", EntityType.BODY));

        // --- 6B. 5th Dorsal Anchor Bolt (+4mm Higher in Z for 7mm Part 1A Head Material) ---
        var headSeatZDorsal = topZ - (5.25 * millimeter); // +18.00mm (7mm solid plastic under head!)
        var nutRoofZDorsal  = -7 * millimeter;             // Raised 4mm
        var nutFloorZDorsal = nutRoofZDorsal - nutSlotH; // -9.80mm

        idx += 1;
        fCylinder(context, id + ("holeCyl" ~ idx), {
                "bottomCenter" : vector(0 * millimeter, spineBoltY, -26 * millimeter),
                "topCenter"    : vector(0 * millimeter, spineBoltY,  30 * millimeter),
                "radius"       : m4Clear / 2
        });
        boltTools = append(boltTools, qCreatedBy(id + ("holeCyl" ~ idx), EntityType.BODY));

        fCylinder(context, id + ("headCyl" ~ idx), {
                "bottomCenter" : vector(0 * millimeter, spineBoltY, headSeatZDorsal),
                "topCenter"    : vector(0 * millimeter, spineBoltY, 30 * millimeter),
                "radius"       : m4Head / 2
        });
        boltTools = append(boltTools, qCreatedBy(id + ("headCyl" ~ idx), EntityType.BODY));

        var dorsalNutSk = newSketchOnPlane(context, id + "dorsalNutSk", {
                "sketchPlane" : plane(vector(0 * millimeter, 0 * millimeter, nutFloorZDorsal), vector(0, 0, 1), vector(1, 0, 0))
        });
        skRegularPolygon(dorsalNutSk, "dorsalNut", {
                "center" : vector(0 * millimeter, spineBoltY),
                "firstVertex" : vector(0 * millimeter, spineBoltY) + vector(m4Nut / (2 * cos(30 * degree)), 0 * millimeter),
                "sides" : 6
        });
        skSolve(dorsalNutSk);

        opExtrude(context, id + "extDorsalNut", {
                "entities" : qSketchRegion(id + "dorsalNutSk"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : nutSlotH
        });
        boltTools = append(boltTools, qCreatedBy(id + "extDorsalNut", EntityType.BODY));

        fCuboid(context, id + "sideSlotDorsal", {
                "corner1" : vector(0 * millimeter, spineBoltY - (m4Nut / 2), nutFloorZDorsal),
                "corner2" : vector(50 * millimeter, spineBoltY + (m4Nut / 2), nutRoofZDorsal)
        });
        boltTools = append(boltTools, qCreatedBy(id + "sideSlotDorsal", EntityType.BODY));


        // 7. Riser Peg Locking Pin Hole (M4 Through-Hole along Y-axis at X = 0mm, Z = +25mm)
        fCylinder(context, id + "pinCyl", {
                "bottomCenter" : vector(0 * millimeter, pegCenterY - 15 * millimeter, 25 * millimeter),
                "topCenter"    : vector(0 * millimeter, pegCenterY + 15 * millimeter, 25 * millimeter),
                "radius"       : m4Clear / 2
        });
        boltTools = append(boltTools, qCreatedBy(id + "pinCyl", EntityType.BODY));

        // 8. Subtract All Cutouts
        opBoolean(context, id + "finalCut", {
                "tools" : qUnion( concatenateArrays([
                        [
                            qCreatedBy(id + "extTube", EntityType.BODY),
                            qCreatedBy(id + "gapToolHoriz", EntityType.BODY),
                            qCreatedBy(id + "armClearanceCut", EntityType.BODY)
                        ],
                        boltTools
                ]) ),
                "targets" : qCreatedBy(id + "clampBlock", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
    
// =========================================================================
// PART 2: Modular 2-Piece Riser Stem (Part 2A Extension + Part 2B Upper Head)
// =========================================================================
annotation { "Feature Type Name" : "OnStage Riser Stem" }
export const onStageRiserStem = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var m4Clear = getVar(context, "m4_clear", 4.4 * millimeter);
        var m4Nut   = getVar(context, "m4_nut", 7.4 * millimeter);
        var m4Head  = getVar(context, "m4_head", 7.6 * millimeter);
        var pegSize = getVar(context, "peg_size", 20.0 * millimeter);
        var tol      = getVar(context, "tol", 0.3 * millimeter);

        var colW   = 40 * millimeter; // 40mm wide
        var colD   = 30 * millimeter; // 30mm deep
        var halfW  = colW / 2;       // 20mm
        var halfD  = colD / 2;       // 15mm
        var pegH   = 30 * millimeter; // 30mm tall mating peg (matches Part 1B)
        var doveH  = 70 * millimeter; // 70mm tall mega-dovetail
        var pinZ   = 15 * millimeter; // Locking bolt height inside sockets/pegs

        // Splitting the 223mm column into two bed-friendly segments:
        // 115mm (2A body) + 108mm (2B body) = 223mm total column height
        var colH2A = 115 * millimeter; // Part 2A total length = 115 + 30 = 145mm
        var colH2B = 108 * millimeter; // Part 2B total length = 108 + 70 = 178mm

        var socketSize = pegSize + tol;
        var halfSoc    = socketSize / 2;
        var halfPeg    = pegSize / 2;

        // =================================================================
        // PART 2A: Lower Modular Extension Column (X = 75mm, Y = 0mm)
        // =================================================================
        var cxA = 75 * millimeter;
        var cyA = 0 * millimeter;

        // 1. Main 40x30x115mm Column Body
        fCuboid(context, id + "col2A", {
                "corner1" : vector(cxA - halfW, cyA - halfD, 0 * millimeter),
                "corner2" : vector(cxA + halfW, cyA + halfD, colH2A)
        });

        opFillet(context, id + "filletCol2A", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "col2A", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 3 * millimeter
        });

        // 2. Top 20x20x30mm Male Coupling Peg (Z = 115mm to 145mm)
        fCuboid(context, id + "peg2A", {
                "corner1" : vector(cxA - halfPeg, cyA - halfPeg, colH2A),
                "corner2" : vector(cxA + halfPeg, cyA + halfPeg, colH2A + pegH)
        });

        opBoolean(context, id + "union2A", {
                "tools" : qUnion([
                        qCreatedBy(id + "col2A", EntityType.BODY),
                        qCreatedBy(id + "peg2A", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 3. Bottom Female Socket Cutout (31mm deep) + Lower & Upper M4 Locking Holes
        fCuboid(context, id + "socketCut2A", {
                "corner1" : vector(cxA - halfSoc, cyA - halfSoc, -1 * millimeter),
                "corner2" : vector(cxA + halfSoc, cyA + halfSoc, 31 * millimeter)
        });

        // Lower Socket M4 Through-Hole (Z = 15mm)
        fCylinder(context, id + "pinCyl2A_Bot", {
                "bottomCenter" : vector(cxA, cyA - (20 * millimeter), pinZ),
                "topCenter"    : vector(cxA, cyA + (20 * millimeter), pinZ),
                "radius"       : m4Clear / 2
        });

        // Lower Socket Front M4 Head Counterbore (2.0mm deep)
        fCylinder(context, id + "headCyl2A_Bot", {
                "bottomCenter" : vector(cxA, cyA - (20 * millimeter), pinZ),
                "topCenter"    : vector(cxA, cyA - (13 * millimeter), pinZ),
                "radius"       : m4Head / 2
        });

        // Lower Socket Rear M4 Hex Nut Trap (2.0mm deep)
        var nutSk2A = newSketchOnPlane(context, id + "nutSk2A", {
                "sketchPlane" : plane(vector(cxA, cyA + halfD, pinZ), vector(0, 1, 0), vector(1, 0, 0))
        });
        skRegularPolygon(nutSk2A, "hex2A", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m4Nut / (2 * cos(30 * degree))),
                "sides" : 6
        });
        skSolve(nutSk2A);

        opExtrude(context, id + "extNut2A", {
                "entities" : qSketchRegion(id + "nutSk2A"),
                "direction" : vector(0, -1, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : 2.0 * millimeter
        });

        // Upper Peg M4 Through-Hole (Z = 115 + 15 = 130mm)
        fCylinder(context, id + "pinCyl2A_Top", {
                "bottomCenter" : vector(cxA, cyA - (15 * millimeter), colH2A + pinZ),
                "topCenter"    : vector(cxA, cyA + (15 * millimeter), colH2A + pinZ),
                "radius"       : m4Clear / 2
        });

        opBoolean(context, id + "finalCut2A", {
                "tools" : qUnion([
                        qCreatedBy(id + "socketCut2A", EntityType.BODY),
                        qCreatedBy(id + "pinCyl2A_Bot", EntityType.BODY),
                        qCreatedBy(id + "headCyl2A_Bot", EntityType.BODY),
                        qCreatedBy(id + "extNut2A", EntityType.BODY),
                        qCreatedBy(id + "pinCyl2A_Top", EntityType.BODY)
                ]),
                "targets" : qCreatedBy(id + "col2A", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });


        // =================================================================
        // PART 2B: Upper Dovetail Riser Head (X = 75mm, Y = 60mm)
        // Positioned directly behind Part 2A in +Y so it stays completely 
        // clear of Part 3A (Lower Music Desk at X = 110mm..350mm)
        // =================================================================
        var cxB = 75 * millimeter;
        var cyB = 60 * millimeter;

        // 1. Main 40x30x108mm Column Body
        fCuboid(context, id + "col2B", {
                "corner1" : vector(cxB - halfW, cyB - halfD, 0 * millimeter),
                "corner2" : vector(cxB + halfW, cyB + halfD, colH2B)
        });

        opFillet(context, id + "filletCol2B", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "col2B", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 3 * millimeter
        });

        // 2. Mega Male Dovetail Slider (Z = 108mm to 178mm)
        var doveSketch = newSketchOnPlane(context, id + "doveSketch", {
                "sketchPlane" : plane(vector(cxB, cyB, colH2B), vector(0, 0, 1), vector(1, 0, 0))
        });
        var yBack    = halfD;                      // +15mm (flush with back face of column for flat printing!)
        var yFront   = halfD - (18 * millimeter);  // -3mm  (18mm thick mega-dovetail)
        var halfNeck = 13.0 * millimeter;           // 26mm total neck width
        var halfWide = 19.0 * millimeter;           // 38mm total front flare width

        skLineSegment(doveSketch, "backEdge",  { "start" : vector(-halfNeck, yBack),  "end" : vector( halfNeck, yBack) });
        skLineSegment(doveSketch, "rightEdge", { "start" : vector( halfNeck, yBack),  "end" : vector( halfWide, yFront) });
        skLineSegment(doveSketch, "frontEdge", { "start" : vector( halfWide, yFront), "end" : vector(-halfWide, yFront) });
        skLineSegment(doveSketch, "leftEdge",  { "start" : vector(-halfWide, yFront), "end" : vector(-halfNeck, yBack) });
        skSolve(doveSketch);

        opExtrude(context, id + "extDove", {
                "entities" : qSketchRegion(id + "doveSketch"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : doveH
        });

        opBoolean(context, id + "union2B", {
                "tools" : qUnion([
                        qCreatedBy(id + "col2B", EntityType.BODY),
                        qCreatedBy(id + "extDove", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 3. Bottom Female Socket Cutout (31mm deep) + M4 Locking Bolt Bore
        fCuboid(context, id + "socketCut2B", {
                "corner1" : vector(cxB - halfSoc, cyB - halfSoc, -1 * millimeter),
                "corner2" : vector(cxB + halfSoc, cyB + halfSoc, 31 * millimeter)
        });

        fCylinder(context, id + "pinCyl2B", {
                "bottomCenter" : vector(cxB, cyB - (20 * millimeter), pinZ),
                "topCenter"    : vector(cxB, cyB + (20 * millimeter), pinZ),
                "radius"       : m4Clear / 2
        });

        fCylinder(context, id + "headCyl2B", {
                "bottomCenter" : vector(cxB, cyB - (20 * millimeter), pinZ),
                "topCenter"    : vector(cxB, cyB - (13 * millimeter), pinZ),
                "radius"       : m4Head / 2
        });

        var nutSk2B = newSketchOnPlane(context, id + "nutSk2B", {
                "sketchPlane" : plane(vector(cxB, cyB + halfD, pinZ), vector(0, 1, 0), vector(1, 0, 0))
        });
        skRegularPolygon(nutSk2B, "hex2B", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m4Nut / (2 * cos(30 * degree))),
                "sides" : 6
        });
        skSolve(nutSk2B);

        opExtrude(context, id + "extNut2B", {
                "entities" : qSketchRegion(id + "nutSk2B"),
                "direction" : vector(0, -1, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : 2.0 * millimeter
        });

        opBoolean(context, id + "finalCut2B", {
                "tools" : qUnion([
                        qCreatedBy(id + "socketCut2B", EntityType.BODY),
                        qCreatedBy(id + "pinCyl2B", EntityType.BODY),
                        qCreatedBy(id + "headCyl2B", EntityType.BODY),
                        qCreatedBy(id + "extNut2B", EntityType.BODY)
                ]),
                "targets" : qCreatedBy(id + "col2B", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });

// =========================================================================
// PART 3A: Lower Stationary Music Desk (Unified Side Profile & Tapered Spine)
// =========================================================================
annotation { "Feature Type Name" : "OnStage Music Desk 3A (Lower)" }
export const onStageMusicDesk3A = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var tol        = getVar(context, "tol", 0.3 * millimeter);
        var deskAngle = getVar(context, "desk_angle", 15 * degree);
        var m3Clear   = getVar(context, "m3_clear", 3.4 * millimeter);

        var slideTol  = tol + (0.15 * millimeter);

        var cx = 230 * millimeter;
        var cy = 0 * millimeter;

        var deskW  = 240 * millimeter;
        var halfW  = deskW / 2;       // 120mm
        var lowerH = 180 * millimeter; // Height of Part 3A lower plate
        var plateT = 6 * millimeter;   // 6mm rigid main backplate
        var shelfT = 8 * millimeter;   // 8mm bottom shelf
        var shelfD = 48 * millimeter;  // 48mm inside book-resting depth
        var lipT   = 5 * millimeter;   // 5mm front retention lip thickness
        var lipH   = 8 * millimeter;   // 8mm upward front retention lip

        var yFrontEdge   = cy - plateT - shelfD - lipT; // -59mm
        var railXOffsets = [-75 * millimeter, 75 * millimeter];

        // 1. Lower Vertical Backing Plate (Y = -6mm to 0mm, Z = 0 to 180mm)
        fCuboid(context, id + "backPlate", {
                "corner1" : vector(cx - halfW, cy - plateT, 0 * millimeter),
                "corner2" : vector(cx + halfW, cy,           lowerH)
        });

        // 2. Continuous Profiled Book Shelf + Front Lip + 4mm Inside Root Chamfer in ONE Sketch!
        // Note: Sketch plane X-axis is vector(0, 1, 0) [Global Y] and Y-axis is vector(0, 0, 1) [Global Z]
        var shelfSketch = newSketchOnPlane(context, id + "shelfSketch", {
                "sketchPlane" : plane(vector(cx - halfW, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var lipTopZ = shelfT + lipH;         // 16mm
        var rLip     = 2.4 * millimeter;        // Smooth 2.4mm front-top bullnose radius on the 5mm lip
        var arcOff   = rLip * (1 - cos(45 * degree)); // Exact 45-deg point on circle (~0.703mm from corner)

        var s1 = vector(-plateT,                  0 * millimeter);         // Bottom-back at backplate
        var s2 = vector(yFrontEdge,              0 * millimeter);         // Bottom-front (flat on print bed)
        var s3 = vector(yFrontEdge,              lipTopZ - rLip);      // Start of front-top lip curve
        var sM = vector(yFrontEdge + arcOff,    lipTopZ - arcOff);    // Exact tangent arc midpoint
        var s4 = vector(yFrontEdge + rLip,      lipTopZ);              // End of front-top lip curve
        var s5 = vector(yFrontEdge + lipT,      lipTopZ);              // Top-back of lip
        var s6 = vector(yFrontEdge + lipT,      shelfT);                // Inside bottom of lip
        var s7 = vector(-plateT - 4 * millimeter, shelfT);                // Start of 4mm inside root chamfer
        var s8 = vector(-plateT,                  shelfT + 4 * millimeter); // Top of 4mm inside root chamfer

        skLineSegment(shelfSketch, "sBot",      { "start" : s1, "end" : s2 });
        skLineSegment(shelfSketch, "sFront",    { "start" : s2, "end" : s3 });
        skArc(shelfSketch,         "sNoseArc",  { "start" : s3, "mid" : sM, "end" : s4 });
        skLineSegment(shelfSketch, "sLipTop",   { "start" : s4, "end" : s5 });
        skLineSegment(shelfSketch, "sLipBack",  { "start" : s5, "end" : s6 });
        skLineSegment(shelfSketch, "sShelfTop", { "start" : s6, "end" : s7 });
        skLineSegment(shelfSketch, "sRootBev",  { "start" : s7, "end" : s8 });
        skLineSegment(shelfSketch, "sClose",    { "start" : s8, "end" : s1 });
        skSolve(shelfSketch);

        opExtrude(context, id + "extShelfLip", {
                "entities" : qSketchRegion(id + "shelfSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : deskW
        });

        // 3. Full-Width Lower Rear Torsion Spine (Y = 0 to +6mm, Z = 0 to 50mm)
        // Making it full-width (cx - halfW to cx + halfW) makes its left/right faces 100% coplanar with
        // backPlate and extShelfLip, so when unioned below, they merge into ONE flat side face with zero steps!
        fCuboid(context, id + "rearSpine", {
                "corner1" : vector(cx - halfW, cy,                  0 * millimeter),
                "corner2" : vector(cx + halfW, cy + 6 * millimeter, 50 * millimeter)
        });

        // 4. Union the Main Desk Shell First (Merges Backplate + Shelf/Lip + Rear Spine into a single continuous body)
        opBoolean(context, id + "unionDeskShell", {
                "tools" : qUnion([
                        qCreatedBy(id + "backPlate", EntityType.BODY),
                        qCreatedBy(id + "extShelfLip", EntityType.BODY),
                        qCreatedBy(id + "rearSpine", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 5. Round the Outer Vertical Edges of the Unified Shell!
        // Because the 3 parts are already unioned, Onshape rounds the TRUE outer perimeter corners (at Y = -59mm, Y = 0mm, Y = +6mm)
        // so the rear spine tapers smoothly into the backplate edge with zero internal pinches!
        var shellBody = qCreatedBy(id + "backPlate", EntityType.BODY);
        try silent
        {
            opFillet(context, id + "filletOuterVerticals", {
                "entities" : qParallelEdges(qOwnedByBody(shellBody, EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 4.5 * millimeter
            });
        }

        // 6. Two Vertical Female Dovetail Guide Housings (X = +/-75mm, Z = 50mm to 180mm)
        var guideHalfW = 16 * millimeter;
        var guideDepth  = 14 * millimeter;
        var guideBodies  = [];
        var gIdx = 0;

        for (var rx in railXOffsets)
        {
            gIdx += 1;
            fCuboid(context, id + ("guideBlock" ~ gIdx), {
                    "corner1" : vector(cx + rx - guideHalfW, cy,               50 * millimeter),
                    "corner2" : vector(cx + rx + guideHalfW, cy + guideDepth, lowerH)
            });
            guideBodies = append(guideBodies, qCreatedBy(id + ("guideBlock" ~ gIdx), EntityType.BODY));
        }

        // 7. Center Angled Heavy-Duty Riser Receiver Block (64mm wide x 95mm tall housing)
        var recHalfW = 32 * millimeter;
        var recHeight = 95 * millimeter;
        var baseDepth = 26 * millimeter + (recHeight * sin(deskAngle));

        var wedgeSketch = newSketchOnPlane(context, id + "wedgeSketch", {
                "sketchPlane" : plane(vector(cx - recHalfW, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var w1 = vector(0 * millimeter, 0 * millimeter);
        var w2 = vector(baseDepth,     0 * millimeter);
        var w3 = vector(baseDepth - (recHeight * sin(deskAngle)), recHeight * cos(deskAngle));
        var w4 = vector(0 * millimeter, recHeight * cos(deskAngle));

        skLineSegment(wedgeSketch, "wBot",   { "start" : w1, "end" : w2 });
        skLineSegment(wedgeSketch, "wBack",  { "start" : w2, "end" : w3 });
        skLineSegment(wedgeSketch, "wTop",   { "start" : w3, "end" : w4 });
        skLineSegment(wedgeSketch, "wFront", { "start" : w4, "end" : w1 });
        skSolve(wedgeSketch);

        opExtrude(context, id + "extReceiver", {
                "entities" : qSketchRegion(id + "wedgeSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : recHalfW * 2
        });

        // Union Guide Blocks and Center Receiver onto the Filleted Desk Shell
        opBoolean(context, id + "unionLowerDesk", {
                "tools" : qUnion(concatenateArrays([
                        [
                            shellBody,
                            qCreatedBy(id + "extReceiver", EntityType.BODY)
                        ],
                        guideBodies
                ])),
                "operationType" : BooleanOperationType.UNION
        });

        // 8. Cut Center Angled Riser Female Dovetail + Dual Vertical Slider Female Dovetails + Detent Pin Holes
        var uSlide = vector(0, -sin(deskAngle), cos(deskAngle));
        var cornerOrigin = vector(cx, baseDepth, 0 * millimeter) - (8 * millimeter) * uSlide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, uSlide, vector(1, 0, 0))
        });

        var dOuter   = 2 * millimeter;
        var dInner   = -(18 * millimeter) - tol;
        var halfNeck = (13.0 * millimeter) + tol;
        var halfWide = (19.0 * millimeter) + tol;

        skLineSegment(doveCutSketch, "dBack",  { "start" : vector(-halfNeck, dOuter), "end" : vector( halfNeck, dOuter) });
        skLineSegment(doveCutSketch, "dRight", { "start" : vector( halfNeck, dOuter), "end" : vector( halfWide, dInner) });
        skLineSegment(doveCutSketch, "dFront", { "start" : vector( halfWide, dInner), "end" : vector(-halfWide, dInner) });
        skLineSegment(doveCutSketch, "dLeft",  { "start" : vector(-halfWide, dInner), "end" : vector(-halfNeck, dOuter) });
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : uSlide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        var femSlideSk = newSketchOnPlane(context, id + "femSlideSk", {
                "sketchPlane" : plane(vector(cx, cy, 50 * millimeter), vector(0, 0, 1), vector(1, 0, 0))
        });

        var sYOut  = guideDepth + (1 * millimeter);
        var sYIn   = (5 * millimeter) - slideTol;
        var sHNeck = (6 * millimeter) + slideTol;
        var sHWide = (9 * millimeter) + slideTol;

        var lockTools = [];
        var sIdx = 0;
        for (var rx in railXOffsets)
        {
            sIdx += 1;
            skLineSegment(femSlideSk, "fsB" ~ sIdx, { "start" : vector(rx - sHNeck, sYOut), "end" : vector(rx + sHNeck, sYOut) });
            skLineSegment(femSlideSk, "fsR" ~ sIdx, { "start" : vector(rx + sHNeck, sYOut), "end" : vector(rx + sHWide, sYIn) });
            skLineSegment(femSlideSk, "fsF" ~ sIdx, { "start" : vector(rx + sHWide, sYIn),  "end" : vector(rx - sHWide, sYIn) });
            skLineSegment(femSlideSk, "fsL" ~ sIdx, { "start" : vector(rx - sHWide, sYIn),  "end" : vector(rx - sHNeck, sYOut) });

            fCylinder(context, id + ("baseDetentHole" ~ sIdx), {
                "bottomCenter" : vector(cx + rx - guideHalfW - (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "topCenter"    : vector(cx + rx + guideHalfW + (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "radius"       : m3Clear / 2
            });
            lockTools = append(lockTools, qCreatedBy(id + ("baseDetentHole" ~ sIdx), EntityType.BODY));
        }
        skSolve(femSlideSk);
        opExtrude(context, id + "extFemSlide", {
            "entities" : qSketchRegion(id + "femSlideSk"),
            "direction" : vector(0, 0, 1),
            "endBound" : BoundingType.BLIND,
            "endDepth" : 132 * millimeter
        });
        opBoolean(context, id + "finalLowerCut", {
            "tools" : qUnion(concatenateArrays([
                [
                    qCreatedBy(id + "extDoveCut", EntityType.BODY),
                    qCreatedBy(id + "extFemSlide", EntityType.BODY)
                ],
                lockTools
            ])),
            "targets" : shellBody,
            "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
    
// =========================================================================
// PART 3A-DUAL: Dual-Riser Lower Stationary Music Desk (Left & Right Risers)
// =========================================================================
annotation { "Feature Type Name" : "OnStage Music Desk 3A-Dual (Lower)" }
export const onStageMusicDesk3ADual = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var tol        = getVar(context, "tol", 0.3 * millimeter);
        var deskAngle = getVar(context, "desk_angle", 15 * degree);
        var m3Clear   = getVar(context, "m3_clear", 3.4 * millimeter);

        var slideTol  = tol + (0.15 * millimeter);

        // Positioned directly behind standard Part 3A at Y = 220mm for clean Part Studio viewing
        var cx = 230 * millimeter;
        var cy = 220 * millimeter;

        var deskW  = 240 * millimeter;
        var halfW  = deskW / 2;       // 120mm
        var lowerH = 180 * millimeter; // Height of Part 3A lower plate
        var plateT = 6 * millimeter;   // 6mm rigid main backplate
        var shelfT = 8 * millimeter;   // 8mm bottom shelf
        var shelfD = 48 * millimeter;  // 48mm inside book-resting depth
        var lipT   = 5 * millimeter;   // 5mm front retention lip thickness
        var lipH   = 8 * millimeter;   // 8mm upward front retention lip

        // Sketch-local Y coordinates (relative to cy) so profile math is identical to 3A
        var yFrontLocal  = -plateT - shelfD - lipT; // -59mm
        var railXOffsets = [-75 * millimeter, 75 * millimeter];
        var riserXOffsets = [-75 * millimeter, 75 * millimeter]; // 150mm center-to-center dual riser spacing

        // 1. Lower Vertical Backing Plate (Y = cy - 6mm to cy, Z = 0 to 180mm)
        fCuboid(context, id + "backPlate", {
                "corner1" : vector(cx - halfW, cy - plateT, 0 * millimeter),
                "corner2" : vector(cx + halfW, cy,           lowerH)
        });

        // 2. Continuous Profiled Book Shelf + Front Lip + 4mm Inside Root Chamfer
        var shelfSketch = newSketchOnPlane(context, id + "shelfSketch", {
                "sketchPlane" : plane(vector(cx - halfW, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var lipTopZ = shelfT + lipH;                // 16mm
        var rLip     = 2.4 * millimeter;               // Smooth 2.4mm front-top bullnose radius
        var arcOff   = rLip * (1 - cos(45 * degree)); // Exact 45-deg tangent point

        var s1 = vector(-plateT,                  0 * millimeter);
        var s2 = vector(yFrontLocal,             0 * millimeter);
        var s3 = vector(yFrontLocal,             lipTopZ - rLip);
        var sM = vector(yFrontLocal + arcOff,   lipTopZ - arcOff);
        var s4 = vector(yFrontLocal + rLip,     lipTopZ);
        var s5 = vector(yFrontLocal + lipT,     lipTopZ);
        var s6 = vector(yFrontLocal + lipT,     shelfT);
        var s7 = vector(-plateT - 4 * millimeter, shelfT);
        var s8 = vector(-plateT,                  shelfT + 4 * millimeter);

        skLineSegment(shelfSketch, "sBot",      { "start" : s1, "end" : s2 });
        skLineSegment(shelfSketch, "sFront",    { "start" : s2, "end" : s3 });
        skArc(shelfSketch,         "sNoseArc",  { "start" : s3, "mid" : sM, "end" : s4 });
        skLineSegment(shelfSketch, "sLipTop",   { "start" : s4, "end" : s5 });
        skLineSegment(shelfSketch, "sLipBack",  { "start" : s5, "end" : s6 });
        skLineSegment(shelfSketch, "sShelfTop", { "start" : s6, "end" : s7 });
        skLineSegment(shelfSketch, "sRootBev",  { "start" : s7, "end" : s8 });
        skLineSegment(shelfSketch, "sClose",    { "start" : s8, "end" : s1 });
        skSolve(shelfSketch);

        opExtrude(context, id + "extShelfLip", {
                "entities" : qSketchRegion(id + "shelfSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : deskW
        });

        // 3. Full-Width Lower Rear Torsion Spine (Y = cy to cy + 6mm, Z = 0 to 50mm)
        fCuboid(context, id + "rearSpine", {
                "corner1" : vector(cx - halfW, cy,                  0 * millimeter),
                "corner2" : vector(cx + halfW, cy + 6 * millimeter, 50 * millimeter)
        });

        // 4. Union the Main Desk Shell First
        opBoolean(context, id + "unionDeskShell", {
                "tools" : qUnion([
                        qCreatedBy(id + "backPlate", EntityType.BODY),
                        qCreatedBy(id + "extShelfLip", EntityType.BODY),
                        qCreatedBy(id + "rearSpine", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 5. Round the Outer Vertical Edges of the Unified Shell
        var shellBody = qCreatedBy(id + "backPlate", EntityType.BODY);
        try silent
        {
            opFillet(context, id + "filletOuterVerticals", {
                "entities" : qParallelEdges(qOwnedByBody(shellBody, EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 4.5 * millimeter
            });
        }

        // 6. Two Vertical Female Dovetail Guide Housings (X = cx +/- 75mm, Z = 50mm to 180mm)
        var guideHalfW = 16 * millimeter;
        var guideDepth  = 14 * millimeter;
        var addBodies    = [shellBody];
        var gIdx = 0;

        for (var rx in railXOffsets)
        {
            gIdx += 1;
            fCuboid(context, id + ("guideBlock" ~ gIdx), {
                    "corner1" : vector(cx + rx - guideHalfW, cy,               50 * millimeter),
                    "corner2" : vector(cx + rx + guideHalfW, cy + guideDepth, lowerH)
            });
            addBodies = append(addBodies, qCreatedBy(id + ("guideBlock" ~ gIdx), EntityType.BODY));
        }

        // 7. Dual Left & Right Angled Heavy-Duty Riser Receiver Blocks (at X = cx +/- 75mm)
        var recHalfW = 32 * millimeter;
        var recHeight = 95 * millimeter;
        var baseDepth = 26 * millimeter + (recHeight * sin(deskAngle));

        var rIdx = 0;
        for (var roff in riserXOffsets)
        {
            rIdx += 1;
            var wedgeSk = newSketchOnPlane(context, id + ("wedgeSk" ~ rIdx), {
                    "sketchPlane" : plane(vector(cx + roff - recHalfW, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
            });
            var w1 = vector(0 * millimeter, 0 * millimeter);
            var w2 = vector(baseDepth,     0 * millimeter);
            var w3 = vector(baseDepth - (recHeight * sin(deskAngle)), recHeight * cos(deskAngle));
            var w4 = vector(0 * millimeter, recHeight * cos(deskAngle));

            skLineSegment(wedgeSk, "wBot",   { "start" : w1, "end" : w2 });
            skLineSegment(wedgeSk, "wBack",  { "start" : w2, "end" : w3 });
            skLineSegment(wedgeSk, "wTop",   { "start" : w3, "end" : w4 });
            skLineSegment(wedgeSk, "wFront", { "start" : w4, "end" : w1 });
            skSolve(wedgeSk);

            opExtrude(context, id + ("extReceiver" ~ rIdx), {
                    "entities" : qSketchRegion(id + ("wedgeSk" ~ rIdx)),
                    "direction" : vector(1, 0, 0),
                    "endBound" : BoundingType.BLIND,
                    "endDepth" : recHalfW * 2
            });
            addBodies = append(addBodies, qCreatedBy(id + ("extReceiver" ~ rIdx), EntityType.BODY));
        }

        // Union Guide Blocks and Dual Receivers onto the Filleted Desk Shell
        opBoolean(context, id + "unionLowerDesk", {
                "tools" : qUnion(addBodies),
                "operationType" : BooleanOperationType.UNION
        });

        // 8. Cut Dual Angled Riser Female Dovetails + Dual Vertical Slider Female Dovetails + Detent Pin Holes
        var uSlide = vector(0, -sin(deskAngle), cos(deskAngle));
        var cornerOrigin = vector(cx, cy + baseDepth, 0 * millimeter) - (8 * millimeter) * uSlide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, uSlide, vector(1, 0, 0))
        });

        var dOuter   = 2 * millimeter;
        var dInner   = -(18 * millimeter) - tol;
        var halfNeck = (13.0 * millimeter) + tol;
        var halfWide = (19.0 * millimeter) + tol;

        var dcIdx = 0;
        for (var roff in riserXOffsets)
        {
            dcIdx += 1;
            skLineSegment(doveCutSketch, "dBack" ~ dcIdx,  { "start" : vector(roff - halfNeck, dOuter), "end" : vector(roff + halfNeck, dOuter) });
            skLineSegment(doveCutSketch, "dRight" ~ dcIdx, { "start" : vector(roff + halfNeck, dOuter), "end" : vector(roff + halfWide, dInner) });
            skLineSegment(doveCutSketch, "dFront" ~ dcIdx, { "start" : vector(roff + halfWide, dInner), "end" : vector(roff - halfWide, dInner) });
            skLineSegment(doveCutSketch, "dLeft" ~ dcIdx,  { "start" : vector(roff - halfWide, dInner), "end" : vector(roff - halfNeck, dOuter) });
        }
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : uSlide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        var femSlideSk = newSketchOnPlane(context, id + "femSlideSk", {
                "sketchPlane" : plane(vector(cx, cy, 50 * millimeter), vector(0, 0, 1), vector(1, 0, 0))
        });

        var sYOut  = guideDepth + (1 * millimeter);
        var sYIn   = (5 * millimeter) - slideTol;
        var sHNeck = (6 * millimeter) + slideTol;
        var sHWide = (9 * millimeter) + slideTol;

        var lockTools = [];
        var sIdx = 0;
        for (var rx in railXOffsets)
        {
            sIdx += 1;
            skLineSegment(femSlideSk, "fsB" ~ sIdx, { "start" : vector(rx - sHNeck, sYOut), "end" : vector(rx + sHNeck, sYOut) });
            skLineSegment(femSlideSk, "fsR" ~ sIdx, { "start" : vector(rx + sHNeck, sYOut), "end" : vector(rx + sHWide, sYIn) });
            skLineSegment(femSlideSk, "fsF" ~ sIdx, { "start" : vector(rx + sHWide, sYIn),  "end" : vector(rx - sHWide, sYIn) });
            skLineSegment(femSlideSk, "fsL" ~ sIdx, { "start" : vector(rx - sHWide, sYIn),  "end" : vector(rx - sHNeck, sYOut) });

            fCylinder(context, id + ("baseDetentHole" ~ sIdx), {
                "bottomCenter" : vector(cx + rx - guideHalfW - (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "topCenter"    : vector(cx + rx + guideHalfW + (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "radius"       : m3Clear / 2
            });
            lockTools = append(lockTools, qCreatedBy(id + ("baseDetentHole" ~ sIdx), EntityType.BODY));
        }
        skSolve(femSlideSk);

        opExtrude(context, id + "extFemSlide", {
            "entities" : qSketchRegion(id + "femSlideSk"),
            "direction" : vector(0, 0, 1),
            "endBound" : BoundingType.BLIND,
            "endDepth" : 132 * millimeter
        });

        opBoolean(context, id + "finalLowerCut", {
            "tools" : qUnion(concatenateArrays([
                [
                    qCreatedBy(id + "extDoveCut", EntityType.BODY),
                    qCreatedBy(id + "extFemSlide", EntityType.BODY)
                ],
                lockTools
            ])),
            "targets" : shellBody,
            "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
    
// =========================================================================
// PART 3B: Upper Sliding Music Desk (Rounded Plate Sides, Crisp Accessory Rail)
// =========================================================================
annotation { "Feature Type Name" : "OnStage Music Desk 3B (Upper)" }
export const onStageMusicDesk3B = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        // 1. Pull variables from your Variable Table
        var m3Clear = getVar(context, "m3_clear", 3.4 * millimeter);

        // Placed side-by-side at X = 500mm (and resting on Z = 0mm!) so it is 100% separate from 3A!
        var cx = 500 * millimeter;
        var cy = 0 * millimeter;

        var deskW      = 240 * millimeter;
        var halfW      = deskW / 2;       // 120mm
        var plateT     = 6 * millimeter;
        var guideDepth = 14 * millimeter;

        var runnerBotZ = 0 * millimeter;   // Runners start right on the Z = 0 floor for easy viewing & slicing
        var headBotZ   = 130 * millimeter; // 130mm of exposed runner below the 60mm tall upper faceplate
        var headH       = 60 * millimeter;
        var headTopZ   = headBotZ + headH; // Total Part 3B height = 190mm

        var railXOffsets = [-75 * millimeter, 75 * millimeter];

        // 2. Upper Music Desk Plate (240mm wide x 6mm thick x 60mm tall, Z = 130mm to 190mm)
        fCuboid(context, id + "upperPlate", {
                "corner1" : vector(cx - halfW, cy - plateT, headBotZ),
                "corner2" : vector(cx + halfW, cy,           headTopZ)
        });

        // Round the 4 vertical (Z-parallel) side edges of the 6mm upper plate while pristine!
        // Leaves the Z = 190mm top face 100% flat for upside-down bed adhesion, and does not touch the accessory rail!
        try silent
        {
            opFillet(context, id + "filletUpperPlateSides", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "upperPlate", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 2.8 * millimeter
            });
        }

        // 3. Dual Male Dovetail Runners (At X = +/-75mm, extending from Z = 0mm to Z = 143mm)
        var maleSlideSk = newSketchOnPlane(context, id + "maleSlideSk", {
                "sketchPlane" : plane(vector(cx, cy, runnerBotZ), vector(0, 0, 1), vector(1, 0, 0))
        });

        var mYBack  = guideDepth;     // +14mm
        var mYNeck  = 5 * millimeter;  // +5mm
        var mYFront = 0 * millimeter;  // 0mm (connects directly to the back of upperPlate from Z = 130 to 143mm!)
        var mHNeck  = 6 * millimeter;  // 12mm total neck width at Y = +14mm
        var mHWide  = 9 * millimeter;  // 18mm total flare width at Y = +5mm

        var mIdx = 0;
        for (var rx in railXOffsets)
        {
            mIdx += 1;
            var mp1 = vector(rx - mHWide, mYFront);
            var mp2 = vector(rx + mHWide, mYFront);
            var mp3 = vector(rx + mHWide, mYNeck);
            var mp4 = vector(rx + mHNeck, mYBack);
            var mp5 = vector(rx - mHNeck, mYBack);
            var mp6 = vector(rx - mHWide, mYNeck);

            skLineSegment(maleSlideSk, "ms1_" ~ mIdx, { "start" : mp1, "end" : mp2 });
            skLineSegment(maleSlideSk, "ms2_" ~ mIdx, { "start" : mp2, "end" : mp3 });
            skLineSegment(maleSlideSk, "ms3_" ~ mIdx, { "start" : mp3, "end" : mp4 });
            skLineSegment(maleSlideSk, "ms4_" ~ mIdx, { "start" : mp4, "end" : mp5 });
            skLineSegment(maleSlideSk, "ms5_" ~ mIdx, { "start" : mp5, "end" : mp6 });
            skLineSegment(maleSlideSk, "ms6_" ~ mIdx, { "start" : mp6, "end" : mp1 });
        }
        skSolve(maleSlideSk);

        opExtrude(context, id + "extMaleRunners", {
                "entities" : qSketchRegion(id + "maleSlideSk"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : (headTopZ - 47 * millimeter) - runnerBotZ
        });

        // 4. Part 4 Horizontal Clamp Accessory Rail on Top Back of Part 3B (Z = 150mm to 178mm)
        // Inset by 3mm on Left & Right ends (X = cx - 117mm to cx + 117mm) so the rail ends sit cleanly
        // inside the 2.8mm rounded vertical back edge of upperPlate without overhanging in mid-air!
        var railInset  = 3 * millimeter;
        var railBaseZ = headTopZ - (40 * millimeter);
        var railSketch  = newSketchOnPlane(context, id + "railSketch", {
                "sketchPlane" : plane(vector(cx - halfW + railInset, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var u1 = vector(0 * millimeter,  railBaseZ + 4 * millimeter);
        var u2 = vector(6 * millimeter,  railBaseZ + 4 * millimeter);
        var u3 = vector(6 * millimeter,  railBaseZ);
        var u4 = vector(14 * millimeter, railBaseZ + 4 * millimeter);
        var u5 = vector(14 * millimeter, railBaseZ + 24 * millimeter);
        var u6 = vector(6 * millimeter,  railBaseZ + 28 * millimeter);
        var u7 = vector(6 * millimeter,  railBaseZ + 24 * millimeter);
        var u8 = vector(0 * millimeter,  railBaseZ + 24 * millimeter);

        skLineSegment(railSketch, "uL1", { "start" : u1, "end" : u2 });
        skLineSegment(railSketch, "uL2", { "start" : u2, "end" : u3 });
        skLineSegment(railSketch, "uL3", { "start" : u3, "end" : u4 });
        skLineSegment(railSketch, "uL4", { "start" : u4, "end" : u5 });
        skLineSegment(railSketch, "uL5", { "start" : u5, "end" : u6 });
        skLineSegment(railSketch, "uL6", { "start" : u6, "end" : u7 });
        skLineSegment(railSketch, "uL7", { "start" : u7, "end" : u8 });
        skLineSegment(railSketch, "uL8", { "start" : u8, "end" : u1 });
        skSolve(railSketch);

        opExtrude(context, id + "extUpperRail", {
                "entities" : qSketchRegion(id + "railSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : deskW - (2 * railInset)
        });

        // Union all Part 3B Upper Extension components into a single solid body
        opBoolean(context, id + "unionUpperDesk", {
                "tools" : qUnion([
                        qCreatedBy(id + "upperPlate", EntityType.BODY),
                        qCreatedBy(id + "extMaleRunners", EntityType.BODY),
                        qCreatedBy(id + "extUpperRail", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 5. Series of 9 Vertical Detent Pin Holes Spaced Every 15mm Along Both Male Dovetail Runners!
        var runnerHoleTools = [];
        var hIdx = 0;
        for (var rx in railXOffsets)
        {
            for (var k = 0; k < 9; k += 1)
            {
                hIdx += 1;
                var holeZ = runnerBotZ + (110 * millimeter) - (k * 15 * millimeter);

                fCylinder(context, id + ("runnerDetent" ~ hIdx), {
                        "bottomCenter" : vector(cx + rx - 12 * millimeter, cy + 9.5 * millimeter, holeZ),
                        "topCenter"    : vector(cx + rx + 12 * millimeter, cy + 9.5 * millimeter, holeZ),
                        "radius"       : m3Clear / 2
                });
                runnerHoleTools = append(runnerHoleTools, qCreatedBy(id + ("runnerDetent" ~ hIdx), EntityType.BODY));
            }
        }

        // Subtract all 18 detent pin holes from Part 3B
        opBoolean(context, id + "finalUpperCut", {
                "tools" : qUnion(runnerHoleTools),
                "targets" : qCreatedBy(id + "upperPlate", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });


// =========================================================================
// PART 4: Modular Page Clamps (3 Variants for the Upper Back Dovetail Rail)
// =========================================================================
// Helper function to cut the matching Upper Dovetail Rail profile + tolerance
function makeRailCutout(context is Context, id is Id, xStart is ValueWithUnits, width is ValueWithUnits, tol is ValueWithUnits) returns Query
{
    var rSketch = newSketchOnPlane(context, id + "rSketch", {
            "sketchPlane" : plane(vector(xStart - 1 * millimeter, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
    });

    // Matches Part 3's extUpperRail (Y = 0 to 14mm, Z = 140 to 168mm) expanded by tol
    var u1 = vector(-1 * millimeter,        144 * millimeter - tol);
    var u2 = vector( 6 * millimeter - tol,  144 * millimeter - tol);
    var u3 = vector( 6 * millimeter - tol,  140 * millimeter - tol);
    var u4 = vector(14 * millimeter + tol,  144 * millimeter - tol);
    var u5 = vector(14 * millimeter + tol,  164 * millimeter + tol);
    var u6 = vector( 6 * millimeter - tol,  168 * millimeter + tol);
    var u7 = vector( 6 * millimeter - tol,  164 * millimeter + tol);
    var u8 = vector(-1 * millimeter,        164 * millimeter + tol);

    skLineSegment(rSketch, "rL1", { "start" : u1, "end" : u2 });
    skLineSegment(rSketch, "rL2", { "start" : u2, "end" : u3 });
    skLineSegment(rSketch, "rL3", { "start" : u3, "end" : u4 });
    skLineSegment(rSketch, "rL4", { "start" : u4, "end" : u5 });
    skLineSegment(rSketch, "rL5", { "start" : u5, "end" : u6 });
    skLineSegment(rSketch, "rL6", { "start" : u6, "end" : u7 });
    skLineSegment(rSketch, "rL7", { "start" : u7, "end" : u8 });
    skLineSegment(rSketch, "rL8", { "start" : u8, "end" : u1 });
    skSolve(rSketch);

    opExtrude(context, id + "extRailCut", {
            "entities" : qSketchRegion(id + "rSketch"),
            "direction" : vector(1, 0, 0),
            "endBound" : BoundingType.BLIND,
            "endDepth" : width + 2 * millimeter
    });

    return qCreatedBy(id + "extRailCut", EntityType.BODY);
}

annotation { "Feature Type Name" : "OnStage Page Clamps" }
export const onStagePageClamps = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var tol      = getVar(context, "tol", 0.3 * millimeter);
        var m3Clear = getVar(context, "m3_clear", 3.4 * millimeter);
        var m3Nut   = getVar(context, "m3_nut", 5.6 * millimeter);

        // Placed starting at X = 380mm (cleanly to the right of Part 3's X = 350mm edge)
        // All variants are generated at their true Z-height (around Z = 140..180mm) to show exact desk alignment!

        // =====================================================================
        // VARIANT A: Thin Sheet "Swan-Neck" Leaf Spring (X = 380mm, Width = 16mm)
        // =====================================================================
        // 1-piece compliant spring that kisses the front face of the desk (Y = -6mm)
        // with a ski-tip bottom so single sheets slide underneath effortlessly.
        var xA = 660 * millimeter;
        var wA = 16 * millimeter;

        var skA = newSketchOnPlane(context, id + "skA", {
                "sketchPlane" : plane(vector(xA, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        // Outer & inner loop tracing the carriage + overhead arch + 2mm thick flexible leaf + ski-tip
        var aPts = [
            vector(  0 * millimeter, 135 * millimeter), // 1: Carriage bottom-front (flush with Y=0 backplate)
            vector( 20 * millimeter, 135 * millimeter), // 2: Carriage bottom-back
            vector( 20 * millimeter, 189 * millimeter), // 3: Carriage top-back
            vector(-12 * millimeter, 189 * millimeter), // 4: Arch forward over the 6mm desk plate
            vector( -5.5 * millimeter, 148 * millimeter), // 5: Leaf spring pre-load contact point (presses against Y=-6mm face!)
            vector(-14 * millimeter, 136 * millimeter), // 6: Ski-tip flare bottom-front
            vector(-12 * millimeter, 135 * millimeter), // 7: Ski-tip bottom edge
            vector( -3.5 * millimeter, 148 * millimeter), // 8: Inside of contact knee (2mm spring thickness)
            vector( -9.5 * millimeter, 185 * millimeter), // 9: Inside of top arch
            vector( -6 * millimeter - tol, 185 * millimeter), // 10: Clears front of desk top edge (Y=-6mm)
            vector( -6 * millimeter - tol, 180 * millimeter + tol), // 11: Rests on top of desk (Z=180mm)
            vector(  0 * millimeter, 180 * millimeter + tol)  // 12: Back of desk top edge (Y=0mm)
        ];

        for (var i = 0; i < size(aPts); i += 1)
        {
            var nextIdx = (i + 1) % size(aPts);
            skLineSegment(skA, "aL" ~ i, { "start" : aPts[i], "end" : aPts[nextIdx] });
        }
        skSolve(skA);

        opExtrude(context, id + "extA", {
                "entities" : qSketchRegion(id + "skA"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : wA
        });

        var cutA = makeRailCutout(context, id + "cutA", xA, wA, tol);
        opBoolean(context, id + "subA", {
                "tools" : cutA,
                "targets" : qCreatedBy(id + "extA", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });

        // =====================================================================
        // VARIANT B: Medium Book Flip-UP Circular Knuckle Hinge (X = 695mm & 735mm)
        // =====================================================================
        // Coaxial circular knuckles on both B1 and B2 eliminate all square-corner
        // interference so the Batwing Finger rotates smoothly through 180+ degrees!
        var xB1  = 695 * millimeter;
        var wB1  = 24 * millimeter;
        var pivY = 7 * millimeter;
        var pivZ = 191 * millimeter; // Raised 1mm so a 7mm radius knuckle is tangent to Z = 198mm!

        // 1. Base Rail Carriage (Z = 135mm to 183mm, leaving 8mm clearance below the Z = 191mm pivot!)
        var skB1 = newSketchOnPlane(context, id + "skB1", {
                "sketchPlane" : plane(vector(xB1, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var bPts = [
            vector( 0 * millimeter, 135 * millimeter),
            vector(20 * millimeter, 135 * millimeter),
            vector(20 * millimeter, 183 * millimeter),
            vector(-6 * millimeter, 183 * millimeter),
            vector(-6 * millimeter, 180 * millimeter + tol),
            vector( 0 * millimeter, 180 * millimeter + tol)
        ];

        for (var i = 0; i < size(bPts); i += 1)
        {
            var nextIdx = (i + 1) % size(bPts);
            skLineSegment(skB1, "bL" ~ i, { "start" : bPts[i], "end" : bPts[nextIdx] });
        }
        skSolve(skB1);

        opExtrude(context, id + "extB1", {
                "entities" : qSketchRegion(id + "skB1"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : wB1
        });

        // 2. Circular Center Hinge Turret on Top of B1 (14mm wide, 7mm radius drum + lower pedestal)
        fCuboid(context, id + "b1TurretBase", {
                "corner1" : vector(xB1 + 5 * millimeter,  0 * millimeter, 182 * millimeter),
                "corner2" : vector(xB1 + 19 * millimeter, 14 * millimeter, pivZ)
        });
        fCylinder(context, id + "b1TurretCyl", {
                "bottomCenter" : vector(xB1 + 5 * millimeter,  pivY, pivZ),
                "topCenter"    : vector(xB1 + 19 * millimeter, pivY, pivZ),
                "radius"       : 7 * millimeter
        });

        opBoolean(context, id + "unionB1", {
                "tools" : qUnion([
                        qCreatedBy(id + "extB1", EntityType.BODY),
                        qCreatedBy(id + "b1TurretBase", EntityType.BODY),
                        qCreatedBy(id + "b1TurretCyl", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        var cutB1 = makeRailCutout(context, id + "cutB1", xB1, wB1, tol);

        // Horizontal M3 Hinge Hole along X-axis through the Circular Turret
        fCylinder(context, id + "b1Hole", {
                "bottomCenter" : vector(xB1,       pivY, pivZ),
                "topCenter"    : vector(xB1 + wB1, pivY, pivZ),
                "radius"       : m3Clear / 2
        });

        opBoolean(context, id + "subB1", {
                "tools" : qUnion([
                        cutB1,
                        qCreatedBy(id + "b1Hole", EntityType.BODY)
                ]),
                "targets" : qCreatedBy(id + "extB1", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });

        // =====================================================================
        // Part B2: Circular-Knuckle Clevis Batwing Finger (Offset to X = 735mm)
        // =====================================================================
        // Uses 6.5mm radius circular ears + tangent top webs so it rotates with 1.5mm
        // radial clearance above B1's floor AND prints upside-down on a flat Z = 198mm face!
        var xB2        = 735 * millimeter;
        var clevisGap = 14 * millimeter + (2 * tol); // 14.6mm inner gap to straddle the 14mm B1 turret
        var earW      = 4.5 * millimeter;            // 4.5mm thick left and right hinge ears
        var halfGap   = clevisGap / 2;              // 7.3mm
        var earRad    = 6.5 * millimeter;            // 6.5mm radius (leaves 1.5mm clearance above Z = 183mm step!)

        // 1. Left & Right Circular Hinge Drums (Coaxial with pivY = 7mm, pivZ = 191mm)
        fCylinder(context, id + "b2EarCylL", {
                "bottomCenter" : vector(xB2 - halfGap - earW, pivY, pivZ),
                "topCenter"    : vector(xB2 - halfGap,         pivY, pivZ),
                "radius"       : earRad
        });
        fCylinder(context, id + "b2EarCylR", {
                "bottomCenter" : vector(xB2 + halfGap,         pivY, pivZ),
                "topCenter"    : vector(xB2 + halfGap + earW, pivY, pivZ),
                "radius"       : earRad
        });

        // 2. Tangent Upper Ear Webs (Connects the circular drums forward to Y = -1mm, flush at Z = 198mm for flat printing)
        fCuboid(context, id + "b2EarWebL", {
                "corner1" : vector(xB2 - halfGap - earW, -1 * millimeter, pivZ),
                "corner2" : vector(xB2 - halfGap,         pivY,            198 * millimeter)
        });
        fCuboid(context, id + "b2EarWebR", {
                "corner1" : vector(xB2 + halfGap,         -1 * millimeter, pivZ),
                "corner2" : vector(xB2 + halfGap + earW, pivY,            198 * millimeter)
        });

        // 3. Forward Reach Bridge (Starts at Y = -1mm -> 8mm away from pivot so it never touches the 7mm radius B1 turret!)
        fCuboid(context, id + "b2Arm", {
                "corner1" : vector(xB2 - halfGap - earW, -30 * millimeter, 192 * millimeter),
                "corner2" : vector(xB2 + halfGap + earW,  -1 * millimeter, 198 * millimeter)
        });

        // 4. Downward Page-Holding Batwing Paddle at Y = -30mm to -25mm (50mm wide x 36mm tall, Z = 162..198mm)
        fCuboid(context, id + "b2Paddle", {
                "corner1" : vector(xB2 - 25 * millimeter, -30 * millimeter, 162 * millimeter),
                "corner2" : vector(xB2 + 25 * millimeter, -25 * millimeter, 198 * millimeter)
        });

        opBoolean(context, id + "unionB2", {
                "tools" : qUnion([
                        qCreatedBy(id + "b2EarCylL", EntityType.BODY),
                        qCreatedBy(id + "b2EarCylR", EntityType.BODY),
                        qCreatedBy(id + "b2EarWebL", EntityType.BODY),
                        qCreatedBy(id + "b2EarWebR", EntityType.BODY),
                        qCreatedBy(id + "b2Arm", EntityType.BODY),
                        qCreatedBy(id + "b2Paddle", EntityType.BODY)
                ]),
                "operationType" : BooleanOperationType.UNION
        });

        // 5. Horizontal M3 Hinge Hole + Captured Hex Nut Trap in Right Ear (at Y = +7mm, Z = 191mm)
        fCylinder(context, id + "b2PinHole", {
                "bottomCenter" : vector(xB2 - 15 * millimeter, pivY, pivZ),
                "topCenter"    : vector(xB2 + 15 * millimeter, pivY, pivZ),
                "radius"       : m3Clear / 2
        });

        var b2NutSk = newSketchOnPlane(context, id + "b2NutSk", {
                "sketchPlane" : plane(vector(xB2 + halfGap + earW, pivY, pivZ), vector(1, 0, 0), vector(0, 1, 0))
        });
        skRegularPolygon(b2NutSk, "b2Hex", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m3Nut / (2 * cos(30 * degree))),
                "sides" : 6
        });
        skSolve(b2NutSk);

        opExtrude(context, id + "extB2Nut", {
                "entities" : qSketchRegion(id + "b2NutSk"),
                "direction" : vector(-1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : 2.5 * millimeter
        });

        opBoolean(context, id + "subB2", {
                "tools" : qUnion([
                        qCreatedBy(id + "b2PinHole", EntityType.BODY),
                        qCreatedBy(id + "extB2Nut", EntityType.BODY)
                ]),
                "targets" : qCreatedBy(id + "b2EarCylL", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });

        
        // =====================================================================
        // VARIANT C: Thick & Short/Tall Book Deep-Reach S-Spring (X = 495mm)
        // =====================================================================
        // 42mm deep throat reach (to Y = -48mm) with a high-flex C-bow and a
        // deep 65mm vertical plunge (down to Z = 115mm) so it catches BOTH short hymnals & tall thick books!
        var xC = 775 * millimeter;
        var wC = 22 * millimeter;

        var skC = newSketchOnPlane(context, id + "skC", {
                "sketchPlane" : plane(vector(xC, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        // 2.8mm thick compliant C-bow spring rising to Z = 212mm and plunging to Z = 115mm
        var cPts = [
            vector(  0 * millimeter,   135 * millimeter), // 1: Carriage bottom-front
            vector( 20 * millimeter,   135 * millimeter), // 2: Carriage bottom-back
            vector( 20 * millimeter,   212 * millimeter), // 3: High-arch spring back (rises 32mm above desk for tall books!)
            vector(-50 * millimeter,   212 * millimeter), // 4: Deep 44mm throat reach forward over thick spines
            vector(-44 * millimeter,   125 * millimeter), // 5: Plunges down to Z=125mm (catches short 5-inch books!)
            vector(-53 * millimeter,   115 * millimeter), // 6: Forward easy-entry ski-tip flare
            vector(-50.2 * millimeter, 114 * millimeter), // 7: Ski-tip bottom edge
            vector(-41 * millimeter,   125 * millimeter), // 8: Inside of lower knee (3mm thick spring wall)
            vector(-46.8 * millimeter, 208.8 * millimeter), // 9: Inside of front top corner (3.2mm spring wall)
            vector( 16.8 * millimeter, 208.8 * millimeter), // 10: Inside of rear top corner
            vector( 16.8 * millimeter, 184 * millimeter), // 11: Flex relief step behind carriage
            vector( -6 * millimeter - tol, 184 * millimeter), // 12: Clears front of desk top edge
            vector( -6 * millimeter - tol, 180 * millimeter + tol), // 13: Rests on top of desk
            vector(  0 * millimeter,   180 * millimeter + tol)  // 14: Back of desk top edge
        ];

        for (var i = 0; i < size(cPts); i += 1)
        {
            var nextIdx = (i + 1) % size(cPts);
            skLineSegment(skC, "cL" ~ i, { "start" : cPts[i], "end" : cPts[nextIdx] });
        }
        skSolve(skC);

        opExtrude(context, id + "extC", {
                "entities" : qSketchRegion(id + "skC"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : wC
        });

        var cutC = makeRailCutout(context, id + "cutC", xC, wC, tol);
        opBoolean(context, id + "subC", {
                "tools" : cutC,
                "targets" : qCreatedBy(id + "extC", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
 
// =========================================================================
// PART 5: Flat-Bed Printable T-Handle Detent Pin
// =========================================================================
annotation { "Feature Type Name" : "OnStage Detent Pin" }
export const onStageDetentPins = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var m3Clear = getVar(context, "m3_clear", 3.4 * millimeter);
        var tol      = getVar(context, "tol", 0.3 * millimeter);

        // Pin diameter is sized 0.35mm smaller than the 3.4mm hole (approx 3.05mm) for an easy, non-binding slip fit
        var pinRad  = (m3Clear - tol - 0.05 * millimeter) / 2;
        
        // Flattening the top and bottom (2.4mm height) creates a D-profile / double-flat shaft:
        // 1. It prints completely flat on the build plate with zero supports and zero bed-adhesion issues!
        // 2. Continuous perimeter wall loops run the entire 38mm length of the shaft for maximum shear strength!
        var flatH     = 2.4 * millimeter; 
        var shaftLen  = 38 * millimeter; // Passes cleanly through the 32mm wide guide block in double-shear

        var xBase = 825 * millimeter;
        var yOffsets = [0 * millimeter];

        var idx = 0;
        for (var yOff in yOffsets)
        {
            idx += 1;

            // 1. Round Pin Shaft along X-axis (X = 825mm to 863mm)
            fCylinder(context, id + ("shaftCyl" ~ idx), {
                    "bottomCenter" : vector(xBase, yOff, 0 * millimeter),
                    "topCenter"    : vector(xBase + shaftLen, yOff, 0 * millimeter),
                    "radius"       : pinRad
            });

            // 2. Bounding Box to Flatten Top & Bottom of Shaft (Z = -1.2mm to +1.2mm) & Bevel Tip
            var boundSk = newSketchOnPlane(context, id + ("boundSk" ~ idx), {
                    "sketchPlane" : plane(vector(xBase, yOff - 10 * millimeter, 0 * millimeter), vector(0, -1, 0), vector(1, 0, 0))
            });
            var hZ = flatH / 2; // 1.2mm
            var b1 = vector(0 * millimeter,               -hZ);
            var b2 = vector(shaftLen - 1.5 * millimeter, -hZ);
            var b3 = vector(shaftLen,                    -0.5 * millimeter); // Tapered lead-in tip
            var b4 = vector(shaftLen,                     0.5 * millimeter);
            var b5 = vector(shaftLen - 1.5 * millimeter,  hZ);
            var b6 = vector(0 * millimeter,                hZ);

            skLineSegment(boundSk, "bL1" ~ idx, { "start" : b1, "end" : b2 });
            skLineSegment(boundSk, "bL2" ~ idx, { "start" : b2, "end" : b3 });
            skLineSegment(boundSk, "bL3" ~ idx, { "start" : b3, "end" : b4 });
            skLineSegment(boundSk, "bL4" ~ idx, { "start" : b4, "end" : b5 });
            skLineSegment(boundSk, "bL5" ~ idx, { "start" : b5, "end" : b6 });
            skLineSegment(boundSk, "bL6" ~ idx, { "start" : b6, "end" : b1 });
            skSolve(boundSk);

            opExtrude(context, id + ("extBound" ~ idx), {
                    "entities" : qSketchRegion(id + ("boundSk" ~ idx)),
                    "direction" : vector(0, 1, 0),
                    "endBound" : BoundingType.BLIND,
                    "endDepth" : 20 * millimeter
            });

            // Intersect Cylinder and Flat-Top/Tip-Beveled Box to create the print-flat shaft
            opBoolean(context, id + ("flatShaft" ~ idx), {
                    "tools" : qUnion([
                            qCreatedBy(id + ("shaftCyl" ~ idx), EntityType.BODY),
                            qCreatedBy(id + ("extBound" ~ idx), EntityType.BODY)
                    ]),
                    "operationType" : BooleanOperationType.INTERSECTION
            });

            // 3. Ergonomic T-Handle Grip (14mm long x 18mm wide x 2.4mm thick, flush with top/bottom of shaft!)
            fCuboid(context, id + ("tHandle" ~ idx), {
                    "corner1" : vector(xBase - 14 * millimeter, yOff - 9 * millimeter, -hZ),
                    "corner2" : vector(xBase,                   yOff + 9 * millimeter,  hZ)
            });

            // 4. Collar Stop Shoulder (6mm wide x 4mm long) so the pin seats cleanly against the guide block wall
            fCuboid(context, id + ("collar" ~ idx), {
                    "corner1" : vector(xBase,                yOff - 3 * millimeter, -hZ),
                    "corner2" : vector(xBase + 3 * millimeter, yOff + 3 * millimeter,  hZ)
            });

            opBoolean(context, id + ("unionPin" ~ idx), {
                    "tools" : qUnion([
                            qCreatedBy(id + ("flatShaft" ~ idx), EntityType.BODY),
                            qCreatedBy(id + ("tHandle" ~ idx), EntityType.BODY),
                            qCreatedBy(id + ("collar" ~ idx), EntityType.BODY)
                    ]),
                    "operationType" : BooleanOperationType.UNION
            });

            // 5. Finger Pull-Hole / Lanyard Loop in the T-Handle (7mm diameter)
            fCylinder(context, id + ("pullHole" ~ idx), {
                    "bottomCenter" : vector(xBase - 7 * millimeter, yOff, -5 * millimeter),
                    "topCenter"    : vector(xBase - 7 * millimeter, yOff,  5 * millimeter),
                    "radius"       : 3.5 * millimeter
            });

            opBoolean(context, id + ("subPull" ~ idx), {
                    "tools" : qCreatedBy(id + ("pullHole" ~ idx), EntityType.BODY),
                    "targets" : qCreatedBy(id + ("flatShaft" ~ idx), EntityType.BODY),
                    "operationType" : BooleanOperationType.SUBTRACTION
            });
        }
    });

// =========================================================================
// TEST FIT: Mega-Dovetail Receiver Block
// =========================================================================
annotation { "Feature Type Name" : "Test Fit Dovetail Receiver" }
export const testFitReceiver = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
    }
    {
        var tol        = getVar(context, "tol", 0.3 * millimeter);
        var deskAngle = getVar(context, "desk_angle", 15 * degree);
        
        var cx = -150 * millimeter;
        var cy = 0 * millimeter;

        var recHalfW = 32 * millimeter; // 64mm total width
        var recHeight = 95 * millimeter; // 95mm tall housing
        var baseDepth = 26 * millimeter + (recHeight * sin(deskAngle));

        // 1. Build the Solid Angled Housing Block
        var wedgeSketch = newSketchOnPlane(context, id + "wedgeSketch", {
                "sketchPlane" : plane(vector(cx - recHalfW, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var w1 = vector(0 * millimeter, 0 * millimeter);
        var w2 = vector(baseDepth,     0 * millimeter);
        var w3 = vector(baseDepth - (recHeight * sin(deskAngle)), recHeight * cos(deskAngle));
        var w4 = vector(0 * millimeter, recHeight * cos(deskAngle));

        skLineSegment(wedgeSketch, "wBot",   { "start" : w1, "end" : w2 });
        skLineSegment(wedgeSketch, "wBack",  { "start" : w2, "end" : w3 });
        skLineSegment(wedgeSketch, "wTop",   { "start" : w3, "end" : w4 });
        skLineSegment(wedgeSketch, "wFront", { "start" : w4, "end" : w1 });
        skSolve(wedgeSketch);

        opExtrude(context, id + "extReceiver", {
                "entities" : qSketchRegion(id + "wedgeSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : recHalfW * 2
        });

        // 2. Cut the Female Mega-Dovetail Slot + Tolerance
        var uSlide = vector(0, -sin(deskAngle), cos(deskAngle));
        var cornerOrigin = vector(cx, cy + baseDepth, 0 * millimeter) - (8 * millimeter) * uSlide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, uSlide, vector(1, 0, 0))
        });

        var dOuter   = 2 * millimeter;
        var dInner   = -(18 * millimeter) - tol;
        var halfNeck = (13.0 * millimeter) + tol;
        var halfWide = (19.0 * millimeter) + tol;

        skLineSegment(doveCutSketch, "dBack",  { "start" : vector(-halfNeck, dOuter), "end" : vector( halfNeck, dOuter) });
        skLineSegment(doveCutSketch, "dRight", { "start" : vector( halfNeck, dOuter), "end" : vector( halfWide, dInner) });
        skLineSegment(doveCutSketch, "dFront", { "start" : vector( halfWide, dInner), "end" : vector(-halfWide, dInner) });
        skLineSegment(doveCutSketch, "dLeft",  { "start" : vector(-halfWide, dInner), "end" : vector(-halfNeck, dOuter) });
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : uSlide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        opBoolean(context, id + "finalTestCut", {
                "tools" : qCreatedBy(id + "extDoveCut", EntityType.BODY),
                "targets" : qCreatedBy(id + "extReceiver", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
    
