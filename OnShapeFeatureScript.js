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
        var tube_size  = getVar(context, "tube_size", 30.5 * millimeter);
        var tube_rad   = getVar(context, "tube_rad", 3.5 * millimeter);
        var clamp_gap  = getVar(context, "clamp_gap", 2.0 * millimeter);
        var m4_clear   = getVar(context, "m4_clear", 4.4 * millimeter);
        var m4_nut     = getVar(context, "m4_nut", 7.4 * millimeter);
        var m4_head    = getVar(context, "m4_head", 7.6 * millimeter);
        var peg_size   = getVar(context, "peg_size", 20.0 * millimeter);
        var back_reach = getVar(context, "back_reach", 155.0 * millimeter);

        var half_tube = tube_size / 2;                // 15.25mm
        var top_z     = half_tube + (8 * millimeter); // +23.25mm
        var bot_z     = -35 * millimeter;             // -35.00mm

        // Peg center is at Y = 15.25 + 155 + 12.5 = 182.75mm
        var peg_center_y  = half_tube + back_reach + (12.5 * millimeter);
        var arm_extension = 10.0 * millimeter;
        var arm_end_y     = half_tube + back_reach + (25.0 * millimeter) + arm_extension; // 205.25mm
        var seat_front_y  = peg_center_y - (15.0 * millimeter); // 167.75mm (Front edge of 40x30mm riser footprint)
        var spine_bolt_y  = seat_front_y - (20.0 * millimeter); // 147.75mm (20mm in front of riser footprint)

        // 1. Solid 90mm Wide Clamp Block
        fCuboid(context, id + "clampBlock", {
                "corner1" : vector(-45 * millimeter, -30 * millimeter, bot_z),
                "corner2" : vector( 45 * millimeter,  30 * millimeter, top_z)
        });

        opFillet(context, id + "filletClampOuter", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "clampBlock", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 4 * millimeter
        });

        // 2. Profiled Extension Arm (Part 1B) with Swept Curved Bottom Keel
        var armProfileSk = newSketchOnPlane(context, id + "armProfileSk", {
                "sketchPlane" : plane(vector(-25 * millimeter, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var curve_start_y = arm_end_y - (45 * millimeter);
        var a1 = vector(20 * millimeter, bot_z);
        var a2 = vector(curve_start_y,   bot_z);
        var a3 = vector(arm_end_y,       10 * millimeter);
        var a4 = vector(20 * millimeter, 10 * millimeter);

        var aMid = vector(curve_start_y + (31 * millimeter), bot_z + (13 * millimeter));

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
                qContainsPoint(armEdges, vector(-25 * millimeter, 50 * millimeter, bot_z)),
                qContainsPoint(armEdges, vector( 25 * millimeter, 50 * millimeter, bot_z))
        ]);
        var keelArcEdges = qUnion([
                qContainsPoint(armEdges, vector(-25 * millimeter, aMid[0], aMid[1])),
                qContainsPoint(armEdges, vector( 25 * millimeter, aMid[0], aMid[1]))
        ]);
        var rearTopEdge = qContainsPoint(armEdges, vector(0 * millimeter, arm_end_y, 10 * millimeter));

        opFillet(context, id + "filletArmContours", {
                "entities" : qUnion([
                        topLongEdges,
                        botFlatEdges,
                        keelArcEdges,
                        rearTopEdge
                ]),
                "radius" : 5 * millimeter
        });

        // 2B. Central Dorsal Tension Spine on Part 1A (Y = 20mm to seat_front_y, Z = 11mm to top_z)
        var spine_bot_z = 10 * millimeter + (clamp_gap / 2); // +11.00mm
        fCuboid(context, id + "armSpine", {
                "corner1" : vector(-10 * millimeter, 20 * millimeter, spine_bot_z),
                "corner2" : vector( 10 * millimeter, seat_front_y,    top_z)
        });
        var spineBody  = qCreatedBy(id + "armSpine", EntityType.BODY);
        var spineEdges = qOwnedByBody(spineBody, EntityType.EDGE);

        opFillet(context, id + "filletSpine", {
                "entities" : qUnion([
                        qContainsPoint(spineEdges, vector(-10 * millimeter, 100 * millimeter, top_z)), // moved to top of spine
                        qContainsPoint(spineEdges, vector( 10 * millimeter, 100 * millimeter, top_z)), // moved to top of spine
                        qContainsPoint(spineEdges, vector(-10 * millimeter, seat_front_y,     top_z)),
                        qContainsPoint(spineEdges, vector( 10 * millimeter, seat_front_y,     top_z))
                ]),
                "radius" : 10 * millimeter
        });

        // 3. Solid Upward Riser Peg at the Rear End of the Arm
        fCuboid(context, id + "riserPeg", {
                "corner1" : vector(-peg_size / 2, peg_center_y - peg_size / 2, 10 * millimeter),
                "corner2" : vector( peg_size / 2, peg_center_y + peg_size / 2, 40 * millimeter)
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
        var h = half_tube;
        var r = tube_rad;
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
                "corner1" : vector(-50 * millimeter, -35 * millimeter, -clamp_gap / 2),
                "corner2" : vector( 50 * millimeter,  35 * millimeter,  clamp_gap / 2)
        });

        // 5B. Split Part 1A from Part 1B
        fCuboid(context, id + "armClearanceCut", {
                "corner1" : vector(-25 * millimeter - (clamp_gap / 2), 20 * millimeter - clamp_gap, -clamp_gap / 2),
                "corner2" : vector( 25 * millimeter + (clamp_gap / 2), 35 * millimeter,             spine_bot_z)
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

        var head_seat_z_main = top_z - (9.25 * millimeter); // +14.00mm
        var nut_roof_z_main  = -11 * millimeter;
        var nut_slot_h       = 2.8 * millimeter;
        var nut_floor_z_main = nut_roof_z_main - nut_slot_h; // -13.80mm

        var mainNutSk = newSketchOnPlane(context, id + "mainNutSk", {
                "sketchPlane" : plane(vector(0 * millimeter, 0 * millimeter, nut_floor_z_main), vector(0, 0, 1), vector(1, 0, 0))
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
                    "radius"       : m4_clear / 2
            });
            boltTools = append(boltTools, qCreatedBy(id + ("holeCyl" ~ idx), EntityType.BODY));

            fCylinder(context, id + ("headCyl" ~ idx), {
                    "bottomCenter" : vector(bx, by, head_seat_z_main),
                    "topCenter"    : vector(bx, by, 30 * millimeter),
                    "radius"       : m4_head / 2
            });
            boltTools = append(boltTools, qCreatedBy(id + ("headCyl" ~ idx), EntityType.BODY));

            var nutPt = vector(bx, by);
            skRegularPolygon(mainNutSk, "nut" ~ idx, {
                    "center" : nutPt,
                    "firstVertex" : nutPt + vector(m4_nut / (2 * cos(30 * degree)), 0 * millimeter),
                    "sides" : 6
            });

            var x_outer = (bx < 0 * millimeter) ? (-50 * millimeter) : (50 * millimeter);
            var x_min   = (bx < 0 * millimeter) ? x_outer : bx;
            var x_max   = (bx < 0 * millimeter) ? bx : x_outer;

            fCuboid(context, id + ("sideSlot" ~ idx), {
                    "corner1" : vector(x_min, by - (m4_nut / 2), nut_floor_z_main),
                    "corner2" : vector(x_max, by + (m4_nut / 2), nut_roof_z_main)
            });
            boltTools = append(boltTools, qCreatedBy(id + ("sideSlot" ~ idx), EntityType.BODY));
        }
        skSolve(mainNutSk);

        opExtrude(context, id + "extMainNuts", {
                "entities" : qSketchRegion(id + "mainNutSk"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : nut_slot_h
        });
        boltTools = append(boltTools, qCreatedBy(id + "extMainNuts", EntityType.BODY));

        // --- 6B. 5th Dorsal Anchor Bolt (+4mm Higher in Z for 7mm Part 1A Head Material) ---
        var head_seat_z_dorsal = top_z - (5.25 * millimeter); // +18.00mm (7mm solid plastic under head!)
        var nut_roof_z_dorsal  = -7 * millimeter;             // Raised 4mm
        var nut_floor_z_dorsal = nut_roof_z_dorsal - nut_slot_h; // -9.80mm

        idx += 1;
        fCylinder(context, id + ("holeCyl" ~ idx), {
                "bottomCenter" : vector(0 * millimeter, spine_bolt_y, -26 * millimeter),
                "topCenter"    : vector(0 * millimeter, spine_bolt_y,  30 * millimeter),
                "radius"       : m4_clear / 2
        });
        boltTools = append(boltTools, qCreatedBy(id + ("holeCyl" ~ idx), EntityType.BODY));

        fCylinder(context, id + ("headCyl" ~ idx), {
                "bottomCenter" : vector(0 * millimeter, spine_bolt_y, head_seat_z_dorsal),
                "topCenter"    : vector(0 * millimeter, spine_bolt_y, 30 * millimeter),
                "radius"       : m4_head / 2
        });
        boltTools = append(boltTools, qCreatedBy(id + ("headCyl" ~ idx), EntityType.BODY));

        var dorsalNutSk = newSketchOnPlane(context, id + "dorsalNutSk", {
                "sketchPlane" : plane(vector(0 * millimeter, 0 * millimeter, nut_floor_z_dorsal), vector(0, 0, 1), vector(1, 0, 0))
        });
        skRegularPolygon(dorsalNutSk, "dorsalNut", {
                "center" : vector(0 * millimeter, spine_bolt_y),
                "firstVertex" : vector(0 * millimeter, spine_bolt_y) + vector(m4_nut / (2 * cos(30 * degree)), 0 * millimeter),
                "sides" : 6
        });
        skSolve(dorsalNutSk);

        opExtrude(context, id + "extDorsalNut", {
                "entities" : qSketchRegion(id + "dorsalNutSk"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : nut_slot_h
        });
        boltTools = append(boltTools, qCreatedBy(id + "extDorsalNut", EntityType.BODY));

        fCuboid(context, id + "sideSlotDorsal", {
                "corner1" : vector(0 * millimeter, spine_bolt_y - (m4_nut / 2), nut_floor_z_dorsal),
                "corner2" : vector(50 * millimeter, spine_bolt_y + (m4_nut / 2), nut_roof_z_dorsal)
        });
        boltTools = append(boltTools, qCreatedBy(id + "sideSlotDorsal", EntityType.BODY));


        // 7. Riser Peg Locking Pin Hole (M4 Through-Hole along Y-axis at X = 0mm, Z = +25mm)
        fCylinder(context, id + "pinCyl", {
                "bottomCenter" : vector(0 * millimeter, peg_center_y - 15 * millimeter, 25 * millimeter),
                "topCenter"    : vector(0 * millimeter, peg_center_y + 15 * millimeter, 25 * millimeter),
                "radius"       : m4_clear / 2
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
        var m4_clear = getVar(context, "m4_clear", 4.4 * millimeter);
        var m4_nut   = getVar(context, "m4_nut", 7.4 * millimeter);
        var m4_head  = getVar(context, "m4_head", 7.6 * millimeter);
        var peg_size = getVar(context, "peg_size", 20.0 * millimeter);
        var tol      = getVar(context, "tol", 0.3 * millimeter);

        var col_w   = 40 * millimeter; // 40mm wide
        var col_d   = 30 * millimeter; // 30mm deep
        var half_w  = col_w / 2;       // 20mm
        var half_d  = col_d / 2;       // 15mm
        var peg_h   = 30 * millimeter; // 30mm tall mating peg (matches Part 1B)
        var dove_h  = 70 * millimeter; // 70mm tall mega-dovetail
        var pin_z   = 15 * millimeter; // Locking bolt height inside sockets/pegs

        // Splitting the 223mm column into two bed-friendly segments:
        // 115mm (2A body) + 108mm (2B body) = 223mm total column height
        var col_h_2A = 115 * millimeter; // Part 2A total length = 115 + 30 = 145mm
        var col_h_2B = 108 * millimeter; // Part 2B total length = 108 + 70 = 178mm

        var socket_size = peg_size + tol;
        var half_soc    = socket_size / 2;
        var half_peg    = peg_size / 2;

        // =================================================================
        // PART 2A: Lower Modular Extension Column (X = 75mm, Y = 0mm)
        // =================================================================
        var cxA = 75 * millimeter;
        var cyA = 0 * millimeter;

        // 1. Main 40x30x115mm Column Body
        fCuboid(context, id + "col2A", {
                "corner1" : vector(cxA - half_w, cyA - half_d, 0 * millimeter),
                "corner2" : vector(cxA + half_w, cyA + half_d, col_h_2A)
        });

        opFillet(context, id + "filletCol2A", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "col2A", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 3 * millimeter
        });

        // 2. Top 20x20x30mm Male Coupling Peg (Z = 115mm to 145mm)
        fCuboid(context, id + "peg2A", {
                "corner1" : vector(cxA - half_peg, cyA - half_peg, col_h_2A),
                "corner2" : vector(cxA + half_peg, cyA + half_peg, col_h_2A + peg_h)
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
                "corner1" : vector(cxA - half_soc, cyA - half_soc, -1 * millimeter),
                "corner2" : vector(cxA + half_soc, cyA + half_soc, 31 * millimeter)
        });

        // Lower Socket M4 Through-Hole (Z = 15mm)
        fCylinder(context, id + "pinCyl2A_Bot", {
                "bottomCenter" : vector(cxA, cyA - (20 * millimeter), pin_z),
                "topCenter"    : vector(cxA, cyA + (20 * millimeter), pin_z),
                "radius"       : m4_clear / 2
        });

        // Lower Socket Front M4 Head Counterbore (2.0mm deep)
        fCylinder(context, id + "headCyl2A_Bot", {
                "bottomCenter" : vector(cxA, cyA - (20 * millimeter), pin_z),
                "topCenter"    : vector(cxA, cyA - (13 * millimeter), pin_z),
                "radius"       : m4_head / 2
        });

        // Lower Socket Rear M4 Hex Nut Trap (2.0mm deep)
        var nutSk2A = newSketchOnPlane(context, id + "nutSk2A", {
                "sketchPlane" : plane(vector(cxA, cyA + half_d, pin_z), vector(0, 1, 0), vector(1, 0, 0))
        });
        skRegularPolygon(nutSk2A, "hex2A", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m4_nut / (2 * cos(30 * degree))),
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
                "bottomCenter" : vector(cxA, cyA - (15 * millimeter), col_h_2A + pin_z),
                "topCenter"    : vector(cxA, cyA + (15 * millimeter), col_h_2A + pin_z),
                "radius"       : m4_clear / 2
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
                "corner1" : vector(cxB - half_w, cyB - half_d, 0 * millimeter),
                "corner2" : vector(cxB + half_w, cyB + half_d, col_h_2B)
        });

        opFillet(context, id + "filletCol2B", {
                "entities" : qParallelEdges(qOwnedByBody(qCreatedBy(id + "col2B", EntityType.BODY), EntityType.EDGE), vector(0, 0, 1)),
                "radius" : 3 * millimeter
        });

        // 2. Mega Male Dovetail Slider (Z = 108mm to 178mm)
        var doveSketch = newSketchOnPlane(context, id + "doveSketch", {
                "sketchPlane" : plane(vector(cxB, cyB, col_h_2B), vector(0, 0, 1), vector(1, 0, 0))
        });
        var y_back    = half_d;                      // +15mm (flush with back face of column for flat printing!)
        var y_front   = half_d - (18 * millimeter);  // -3mm  (18mm thick mega-dovetail)
        var half_neck = 13.0 * millimeter;           // 26mm total neck width
        var half_wide = 19.0 * millimeter;           // 38mm total front flare width

        skLineSegment(doveSketch, "backEdge",  { "start" : vector(-half_neck, y_back),  "end" : vector( half_neck, y_back) });
        skLineSegment(doveSketch, "rightEdge", { "start" : vector( half_neck, y_back),  "end" : vector( half_wide, y_front) });
        skLineSegment(doveSketch, "frontEdge", { "start" : vector( half_wide, y_front), "end" : vector(-half_wide, y_front) });
        skLineSegment(doveSketch, "leftEdge",  { "start" : vector(-half_wide, y_front), "end" : vector(-half_neck, y_back) });
        skSolve(doveSketch);

        opExtrude(context, id + "extDove", {
                "entities" : qSketchRegion(id + "doveSketch"),
                "direction" : vector(0, 0, 1),
                "endBound" : BoundingType.BLIND,
                "endDepth" : dove_h
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
                "corner1" : vector(cxB - half_soc, cyB - half_soc, -1 * millimeter),
                "corner2" : vector(cxB + half_soc, cyB + half_soc, 31 * millimeter)
        });

        fCylinder(context, id + "pinCyl2B", {
                "bottomCenter" : vector(cxB, cyB - (20 * millimeter), pin_z),
                "topCenter"    : vector(cxB, cyB + (20 * millimeter), pin_z),
                "radius"       : m4_clear / 2
        });

        fCylinder(context, id + "headCyl2B", {
                "bottomCenter" : vector(cxB, cyB - (20 * millimeter), pin_z),
                "topCenter"    : vector(cxB, cyB - (13 * millimeter), pin_z),
                "radius"       : m4_head / 2
        });

        var nutSk2B = newSketchOnPlane(context, id + "nutSk2B", {
                "sketchPlane" : plane(vector(cxB, cyB + half_d, pin_z), vector(0, 1, 0), vector(1, 0, 0))
        });
        skRegularPolygon(nutSk2B, "hex2B", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m4_nut / (2 * cos(30 * degree))),
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
        var desk_angle = getVar(context, "desk_angle", 15 * degree);
        var m3_clear   = getVar(context, "m3_clear", 3.4 * millimeter);

        var slide_tol  = tol + (0.15 * millimeter);

        var cx = 230 * millimeter;
        var cy = 0 * millimeter;

        var desk_w  = 240 * millimeter;
        var half_w  = desk_w / 2;       // 120mm
        var lower_h = 180 * millimeter; // Height of Part 3A lower plate
        var plate_t = 6 * millimeter;   // 6mm rigid main backplate
        var shelf_t = 8 * millimeter;   // 8mm bottom shelf
        var shelf_d = 48 * millimeter;  // 48mm inside book-resting depth
        var lip_t   = 5 * millimeter;   // 5mm front retention lip thickness
        var lip_h   = 8 * millimeter;   // 8mm upward front retention lip

        var y_front_edge   = cy - plate_t - shelf_d - lip_t; // -59mm
        var rail_x_offsets = [-75 * millimeter, 75 * millimeter];

        // 1. Lower Vertical Backing Plate (Y = -6mm to 0mm, Z = 0 to 180mm)
        fCuboid(context, id + "backPlate", {
                "corner1" : vector(cx - half_w, cy - plate_t, 0 * millimeter),
                "corner2" : vector(cx + half_w, cy,           lower_h)
        });

        // 2. Continuous Profiled Book Shelf + Front Lip + 4mm Inside Root Chamfer in ONE Sketch!
        // Note: Sketch plane X-axis is vector(0, 1, 0) [Global Y] and Y-axis is vector(0, 0, 1) [Global Z]
        var shelfSketch = newSketchOnPlane(context, id + "shelfSketch", {
                "sketchPlane" : plane(vector(cx - half_w, 0 * millimeter, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var lip_top_z = shelf_t + lip_h;         // 16mm
        var r_lip     = 2.4 * millimeter;        // Smooth 2.4mm front-top bullnose radius on the 5mm lip
        var arc_off   = r_lip * (1 - cos(45 * degree)); // Exact 45-deg point on circle (~0.703mm from corner)

        var s1 = vector(-plate_t,                  0 * millimeter);         // Bottom-back at backplate
        var s2 = vector(y_front_edge,              0 * millimeter);         // Bottom-front (flat on print bed)
        var s3 = vector(y_front_edge,              lip_top_z - r_lip);      // Start of front-top lip curve
        var sM = vector(y_front_edge + arc_off,    lip_top_z - arc_off);    // Exact tangent arc midpoint
        var s4 = vector(y_front_edge + r_lip,      lip_top_z);              // End of front-top lip curve
        var s5 = vector(y_front_edge + lip_t,      lip_top_z);              // Top-back of lip
        var s6 = vector(y_front_edge + lip_t,      shelf_t);                // Inside bottom of lip
        var s7 = vector(-plate_t - 4 * millimeter, shelf_t);                // Start of 4mm inside root chamfer
        var s8 = vector(-plate_t,                  shelf_t + 4 * millimeter); // Top of 4mm inside root chamfer

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
                "endDepth" : desk_w
        });

        // 3. Full-Width Lower Rear Torsion Spine (Y = 0 to +6mm, Z = 0 to 50mm)
        // Making it full-width (cx - half_w to cx + half_w) makes its left/right faces 100% coplanar with
        // backPlate and extShelfLip, so when unioned below, they merge into ONE flat side face with zero steps!
        fCuboid(context, id + "rearSpine", {
                "corner1" : vector(cx - half_w, cy,                  0 * millimeter),
                "corner2" : vector(cx + half_w, cy + 6 * millimeter, 50 * millimeter)
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
        var guide_half_w = 16 * millimeter;
        var guide_depth  = 14 * millimeter;
        var guideBodies  = [];
        var gIdx = 0;

        for (var rx in rail_x_offsets)
        {
            gIdx += 1;
            fCuboid(context, id + ("guideBlock" ~ gIdx), {
                    "corner1" : vector(cx + rx - guide_half_w, cy,               50 * millimeter),
                    "corner2" : vector(cx + rx + guide_half_w, cy + guide_depth, lower_h)
            });
            guideBodies = append(guideBodies, qCreatedBy(id + ("guideBlock" ~ gIdx), EntityType.BODY));
        }

        // 7. Center Angled Heavy-Duty Riser Receiver Block (64mm wide x 95mm tall housing)
        var rec_half_w = 32 * millimeter;
        var rec_height = 95 * millimeter;
        var base_depth = 26 * millimeter + (rec_height * sin(desk_angle));

        var wedgeSketch = newSketchOnPlane(context, id + "wedgeSketch", {
                "sketchPlane" : plane(vector(cx - rec_half_w, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var w1 = vector(0 * millimeter, 0 * millimeter);
        var w2 = vector(base_depth,     0 * millimeter);
        var w3 = vector(base_depth - (rec_height * sin(desk_angle)), rec_height * cos(desk_angle));
        var w4 = vector(0 * millimeter, rec_height * cos(desk_angle));

        skLineSegment(wedgeSketch, "wBot",   { "start" : w1, "end" : w2 });
        skLineSegment(wedgeSketch, "wBack",  { "start" : w2, "end" : w3 });
        skLineSegment(wedgeSketch, "wTop",   { "start" : w3, "end" : w4 });
        skLineSegment(wedgeSketch, "wFront", { "start" : w4, "end" : w1 });
        skSolve(wedgeSketch);

        opExtrude(context, id + "extReceiver", {
                "entities" : qSketchRegion(id + "wedgeSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : rec_half_w * 2
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
        var u_slide = vector(0, -sin(desk_angle), cos(desk_angle));
        var cornerOrigin = vector(cx, base_depth, 0 * millimeter) - (8 * millimeter) * u_slide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, u_slide, vector(1, 0, 0))
        });

        var d_outer   = 2 * millimeter;
        var d_inner   = -(18 * millimeter) - tol;
        var half_neck = (13.0 * millimeter) + tol;
        var half_wide = (19.0 * millimeter) + tol;

        skLineSegment(doveCutSketch, "dBack",  { "start" : vector(-half_neck, d_outer), "end" : vector( half_neck, d_outer) });
        skLineSegment(doveCutSketch, "dRight", { "start" : vector( half_neck, d_outer), "end" : vector( half_wide, d_inner) });
        skLineSegment(doveCutSketch, "dFront", { "start" : vector( half_wide, d_inner), "end" : vector(-half_wide, d_inner) });
        skLineSegment(doveCutSketch, "dLeft",  { "start" : vector(-half_wide, d_inner), "end" : vector(-half_neck, d_outer) });
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : u_slide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        var femSlideSk = newSketchOnPlane(context, id + "femSlideSk", {
                "sketchPlane" : plane(vector(cx, cy, 50 * millimeter), vector(0, 0, 1), vector(1, 0, 0))
        });

        var s_y_out  = guide_depth + (1 * millimeter);
        var s_y_in   = (5 * millimeter) - slide_tol;
        var s_h_neck = (6 * millimeter) + slide_tol;
        var s_h_wide = (9 * millimeter) + slide_tol;

        var lockTools = [];
        var sIdx = 0;
        for (var rx in rail_x_offsets)
        {
            sIdx += 1;
            skLineSegment(femSlideSk, "fsB" ~ sIdx, { "start" : vector(rx - s_h_neck, s_y_out), "end" : vector(rx + s_h_neck, s_y_out) });
            skLineSegment(femSlideSk, "fsR" ~ sIdx, { "start" : vector(rx + s_h_neck, s_y_out), "end" : vector(rx + s_h_wide, s_y_in) });
            skLineSegment(femSlideSk, "fsF" ~ sIdx, { "start" : vector(rx + s_h_wide, s_y_in),  "end" : vector(rx - s_h_wide, s_y_in) });
            skLineSegment(femSlideSk, "fsL" ~ sIdx, { "start" : vector(rx - s_h_wide, s_y_in),  "end" : vector(rx - s_h_neck, s_y_out) });

            fCylinder(context, id + ("baseDetentHole" ~ sIdx), {
                "bottomCenter" : vector(cx + rx - guide_half_w - (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "topCenter"    : vector(cx + rx + guide_half_w + (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "radius"       : m3_clear / 2
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
        var desk_angle = getVar(context, "desk_angle", 15 * degree);
        var m3_clear   = getVar(context, "m3_clear", 3.4 * millimeter);

        var slide_tol  = tol + (0.15 * millimeter);

        // Positioned directly behind standard Part 3A at Y = 220mm for clean Part Studio viewing
        var cx = 230 * millimeter;
        var cy = 220 * millimeter;

        var desk_w  = 240 * millimeter;
        var half_w  = desk_w / 2;       // 120mm
        var lower_h = 180 * millimeter; // Height of Part 3A lower plate
        var plate_t = 6 * millimeter;   // 6mm rigid main backplate
        var shelf_t = 8 * millimeter;   // 8mm bottom shelf
        var shelf_d = 48 * millimeter;  // 48mm inside book-resting depth
        var lip_t   = 5 * millimeter;   // 5mm front retention lip thickness
        var lip_h   = 8 * millimeter;   // 8mm upward front retention lip

        // Sketch-local Y coordinates (relative to cy) so profile math is identical to 3A
        var y_front_local  = -plate_t - shelf_d - lip_t; // -59mm
        var rail_x_offsets = [-75 * millimeter, 75 * millimeter];
        var riser_x_offsets = [-75 * millimeter, 75 * millimeter]; // 150mm center-to-center dual riser spacing

        // 1. Lower Vertical Backing Plate (Y = cy - 6mm to cy, Z = 0 to 180mm)
        fCuboid(context, id + "backPlate", {
                "corner1" : vector(cx - half_w, cy - plate_t, 0 * millimeter),
                "corner2" : vector(cx + half_w, cy,           lower_h)
        });

        // 2. Continuous Profiled Book Shelf + Front Lip + 4mm Inside Root Chamfer
        var shelfSketch = newSketchOnPlane(context, id + "shelfSketch", {
                "sketchPlane" : plane(vector(cx - half_w, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });

        var lip_top_z = shelf_t + lip_h;                // 16mm
        var r_lip     = 2.4 * millimeter;               // Smooth 2.4mm front-top bullnose radius
        var arc_off   = r_lip * (1 - cos(45 * degree)); // Exact 45-deg tangent point

        var s1 = vector(-plate_t,                  0 * millimeter);
        var s2 = vector(y_front_local,             0 * millimeter);
        var s3 = vector(y_front_local,             lip_top_z - r_lip);
        var sM = vector(y_front_local + arc_off,   lip_top_z - arc_off);
        var s4 = vector(y_front_local + r_lip,     lip_top_z);
        var s5 = vector(y_front_local + lip_t,     lip_top_z);
        var s6 = vector(y_front_local + lip_t,     shelf_t);
        var s7 = vector(-plate_t - 4 * millimeter, shelf_t);
        var s8 = vector(-plate_t,                  shelf_t + 4 * millimeter);

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
                "endDepth" : desk_w
        });

        // 3. Full-Width Lower Rear Torsion Spine (Y = cy to cy + 6mm, Z = 0 to 50mm)
        fCuboid(context, id + "rearSpine", {
                "corner1" : vector(cx - half_w, cy,                  0 * millimeter),
                "corner2" : vector(cx + half_w, cy + 6 * millimeter, 50 * millimeter)
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
        var guide_half_w = 16 * millimeter;
        var guide_depth  = 14 * millimeter;
        var addBodies    = [shellBody];
        var gIdx = 0;

        for (var rx in rail_x_offsets)
        {
            gIdx += 1;
            fCuboid(context, id + ("guideBlock" ~ gIdx), {
                    "corner1" : vector(cx + rx - guide_half_w, cy,               50 * millimeter),
                    "corner2" : vector(cx + rx + guide_half_w, cy + guide_depth, lower_h)
            });
            addBodies = append(addBodies, qCreatedBy(id + ("guideBlock" ~ gIdx), EntityType.BODY));
        }

        // 7. Dual Left & Right Angled Heavy-Duty Riser Receiver Blocks (at X = cx +/- 75mm)
        var rec_half_w = 32 * millimeter;
        var rec_height = 95 * millimeter;
        var base_depth = 26 * millimeter + (rec_height * sin(desk_angle));

        var rIdx = 0;
        for (var roff in riser_x_offsets)
        {
            rIdx += 1;
            var wedgeSk = newSketchOnPlane(context, id + ("wedgeSk" ~ rIdx), {
                    "sketchPlane" : plane(vector(cx + roff - rec_half_w, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
            });
            var w1 = vector(0 * millimeter, 0 * millimeter);
            var w2 = vector(base_depth,     0 * millimeter);
            var w3 = vector(base_depth - (rec_height * sin(desk_angle)), rec_height * cos(desk_angle));
            var w4 = vector(0 * millimeter, rec_height * cos(desk_angle));

            skLineSegment(wedgeSk, "wBot",   { "start" : w1, "end" : w2 });
            skLineSegment(wedgeSk, "wBack",  { "start" : w2, "end" : w3 });
            skLineSegment(wedgeSk, "wTop",   { "start" : w3, "end" : w4 });
            skLineSegment(wedgeSk, "wFront", { "start" : w4, "end" : w1 });
            skSolve(wedgeSk);

            opExtrude(context, id + ("extReceiver" ~ rIdx), {
                    "entities" : qSketchRegion(id + ("wedgeSk" ~ rIdx)),
                    "direction" : vector(1, 0, 0),
                    "endBound" : BoundingType.BLIND,
                    "endDepth" : rec_half_w * 2
            });
            addBodies = append(addBodies, qCreatedBy(id + ("extReceiver" ~ rIdx), EntityType.BODY));
        }

        // Union Guide Blocks and Dual Receivers onto the Filleted Desk Shell
        opBoolean(context, id + "unionLowerDesk", {
                "tools" : qUnion(addBodies),
                "operationType" : BooleanOperationType.UNION
        });

        // 8. Cut Dual Angled Riser Female Dovetails + Dual Vertical Slider Female Dovetails + Detent Pin Holes
        var u_slide = vector(0, -sin(desk_angle), cos(desk_angle));
        var cornerOrigin = vector(cx, cy + base_depth, 0 * millimeter) - (8 * millimeter) * u_slide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, u_slide, vector(1, 0, 0))
        });

        var d_outer   = 2 * millimeter;
        var d_inner   = -(18 * millimeter) - tol;
        var half_neck = (13.0 * millimeter) + tol;
        var half_wide = (19.0 * millimeter) + tol;

        var dcIdx = 0;
        for (var roff in riser_x_offsets)
        {
            dcIdx += 1;
            skLineSegment(doveCutSketch, "dBack" ~ dcIdx,  { "start" : vector(roff - half_neck, d_outer), "end" : vector(roff + half_neck, d_outer) });
            skLineSegment(doveCutSketch, "dRight" ~ dcIdx, { "start" : vector(roff + half_neck, d_outer), "end" : vector(roff + half_wide, d_inner) });
            skLineSegment(doveCutSketch, "dFront" ~ dcIdx, { "start" : vector(roff + half_wide, d_inner), "end" : vector(roff - half_wide, d_inner) });
            skLineSegment(doveCutSketch, "dLeft" ~ dcIdx,  { "start" : vector(roff - half_wide, d_inner), "end" : vector(roff - half_neck, d_outer) });
        }
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : u_slide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        var femSlideSk = newSketchOnPlane(context, id + "femSlideSk", {
                "sketchPlane" : plane(vector(cx, cy, 50 * millimeter), vector(0, 0, 1), vector(1, 0, 0))
        });

        var s_y_out  = guide_depth + (1 * millimeter);
        var s_y_in   = (5 * millimeter) - slide_tol;
        var s_h_neck = (6 * millimeter) + slide_tol;
        var s_h_wide = (9 * millimeter) + slide_tol;

        var lockTools = [];
        var sIdx = 0;
        for (var rx in rail_x_offsets)
        {
            sIdx += 1;
            skLineSegment(femSlideSk, "fsB" ~ sIdx, { "start" : vector(rx - s_h_neck, s_y_out), "end" : vector(rx + s_h_neck, s_y_out) });
            skLineSegment(femSlideSk, "fsR" ~ sIdx, { "start" : vector(rx + s_h_neck, s_y_out), "end" : vector(rx + s_h_wide, s_y_in) });
            skLineSegment(femSlideSk, "fsF" ~ sIdx, { "start" : vector(rx + s_h_wide, s_y_in),  "end" : vector(rx - s_h_wide, s_y_in) });
            skLineSegment(femSlideSk, "fsL" ~ sIdx, { "start" : vector(rx - s_h_wide, s_y_in),  "end" : vector(rx - s_h_neck, s_y_out) });

            fCylinder(context, id + ("baseDetentHole" ~ sIdx), {
                "bottomCenter" : vector(cx + rx - guide_half_w - (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "topCenter"    : vector(cx + rx + guide_half_w + (2 * millimeter), cy + 9.5 * millimeter, 160 * millimeter),
                "radius"       : m3_clear / 2
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
        var m3_clear = getVar(context, "m3_clear", 3.4 * millimeter);

        // Placed side-by-side at X = 500mm (and resting on Z = 0mm!) so it is 100% separate from 3A!
        var cx = 500 * millimeter;
        var cy = 0 * millimeter;

        var desk_w      = 240 * millimeter;
        var half_w      = desk_w / 2;       // 120mm
        var plate_t     = 6 * millimeter;
        var guide_depth = 14 * millimeter;

        var runner_bot_z = 0 * millimeter;   // Runners start right on the Z = 0 floor for easy viewing & slicing
        var head_bot_z   = 130 * millimeter; // 130mm of exposed runner below the 60mm tall upper faceplate
        var head_h       = 60 * millimeter;
        var head_top_z   = head_bot_z + head_h; // Total Part 3B height = 190mm

        var rail_x_offsets = [-75 * millimeter, 75 * millimeter];

        // 2. Upper Music Desk Plate (240mm wide x 6mm thick x 60mm tall, Z = 130mm to 190mm)
        fCuboid(context, id + "upperPlate", {
                "corner1" : vector(cx - half_w, cy - plate_t, head_bot_z),
                "corner2" : vector(cx + half_w, cy,           head_top_z)
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
                "sketchPlane" : plane(vector(cx, cy, runner_bot_z), vector(0, 0, 1), vector(1, 0, 0))
        });

        var m_y_back  = guide_depth;     // +14mm
        var m_y_neck  = 5 * millimeter;  // +5mm
        var m_y_front = 0 * millimeter;  // 0mm (connects directly to the back of upperPlate from Z = 130 to 143mm!)
        var m_h_neck  = 6 * millimeter;  // 12mm total neck width at Y = +14mm
        var m_h_wide  = 9 * millimeter;  // 18mm total flare width at Y = +5mm

        var mIdx = 0;
        for (var rx in rail_x_offsets)
        {
            mIdx += 1;
            var mp1 = vector(rx - m_h_wide, m_y_front);
            var mp2 = vector(rx + m_h_wide, m_y_front);
            var mp3 = vector(rx + m_h_wide, m_y_neck);
            var mp4 = vector(rx + m_h_neck, m_y_back);
            var mp5 = vector(rx - m_h_neck, m_y_back);
            var mp6 = vector(rx - m_h_wide, m_y_neck);

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
                "endDepth" : (head_top_z - 47 * millimeter) - runner_bot_z
        });

        // 4. Part 4 Horizontal Clamp Accessory Rail on Top Back of Part 3B (Z = 150mm to 178mm)
        // Inset by 3mm on Left & Right ends (X = cx - 117mm to cx + 117mm) so the rail ends sit cleanly
        // inside the 2.8mm rounded vertical back edge of upperPlate without overhanging in mid-air!
        var rail_inset  = 3 * millimeter;
        var rail_base_z = head_top_z - (40 * millimeter);
        var railSketch  = newSketchOnPlane(context, id + "railSketch", {
                "sketchPlane" : plane(vector(cx - half_w + rail_inset, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var u1 = vector(0 * millimeter,  rail_base_z + 4 * millimeter);
        var u2 = vector(6 * millimeter,  rail_base_z + 4 * millimeter);
        var u3 = vector(6 * millimeter,  rail_base_z);
        var u4 = vector(14 * millimeter, rail_base_z + 4 * millimeter);
        var u5 = vector(14 * millimeter, rail_base_z + 24 * millimeter);
        var u6 = vector(6 * millimeter,  rail_base_z + 28 * millimeter);
        var u7 = vector(6 * millimeter,  rail_base_z + 24 * millimeter);
        var u8 = vector(0 * millimeter,  rail_base_z + 24 * millimeter);

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
                "endDepth" : desk_w - (2 * rail_inset)
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
        for (var rx in rail_x_offsets)
        {
            for (var k = 0; k < 9; k += 1)
            {
                hIdx += 1;
                var hole_z = runner_bot_z + (110 * millimeter) - (k * 15 * millimeter);

                fCylinder(context, id + ("runnerDetent" ~ hIdx), {
                        "bottomCenter" : vector(cx + rx - 12 * millimeter, cy + 9.5 * millimeter, hole_z),
                        "topCenter"    : vector(cx + rx + 12 * millimeter, cy + 9.5 * millimeter, hole_z),
                        "radius"       : m3_clear / 2
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
        var m3_clear = getVar(context, "m3_clear", 3.4 * millimeter);
        var m3_nut   = getVar(context, "m3_nut", 5.6 * millimeter);

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
                "radius"       : m3_clear / 2
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
        var clevis_gap = 14 * millimeter + (2 * tol); // 14.6mm inner gap to straddle the 14mm B1 turret
        var ear_w      = 4.5 * millimeter;            // 4.5mm thick left and right hinge ears
        var half_gap   = clevis_gap / 2;              // 7.3mm
        var ear_rad    = 6.5 * millimeter;            // 6.5mm radius (leaves 1.5mm clearance above Z = 183mm step!)

        // 1. Left & Right Circular Hinge Drums (Coaxial with pivY = 7mm, pivZ = 191mm)
        fCylinder(context, id + "b2EarCylL", {
                "bottomCenter" : vector(xB2 - half_gap - ear_w, pivY, pivZ),
                "topCenter"    : vector(xB2 - half_gap,         pivY, pivZ),
                "radius"       : ear_rad
        });
        fCylinder(context, id + "b2EarCylR", {
                "bottomCenter" : vector(xB2 + half_gap,         pivY, pivZ),
                "topCenter"    : vector(xB2 + half_gap + ear_w, pivY, pivZ),
                "radius"       : ear_rad
        });

        // 2. Tangent Upper Ear Webs (Connects the circular drums forward to Y = -1mm, flush at Z = 198mm for flat printing)
        fCuboid(context, id + "b2EarWebL", {
                "corner1" : vector(xB2 - half_gap - ear_w, -1 * millimeter, pivZ),
                "corner2" : vector(xB2 - half_gap,         pivY,            198 * millimeter)
        });
        fCuboid(context, id + "b2EarWebR", {
                "corner1" : vector(xB2 + half_gap,         -1 * millimeter, pivZ),
                "corner2" : vector(xB2 + half_gap + ear_w, pivY,            198 * millimeter)
        });

        // 3. Forward Reach Bridge (Starts at Y = -1mm -> 8mm away from pivot so it never touches the 7mm radius B1 turret!)
        fCuboid(context, id + "b2Arm", {
                "corner1" : vector(xB2 - half_gap - ear_w, -30 * millimeter, 192 * millimeter),
                "corner2" : vector(xB2 + half_gap + ear_w,  -1 * millimeter, 198 * millimeter)
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
                "radius"       : m3_clear / 2
        });

        var b2NutSk = newSketchOnPlane(context, id + "b2NutSk", {
                "sketchPlane" : plane(vector(xB2 + half_gap + ear_w, pivY, pivZ), vector(1, 0, 0), vector(0, 1, 0))
        });
        skRegularPolygon(b2NutSk, "b2Hex", {
                "center" : vector(0 * millimeter, 0 * millimeter),
                "firstVertex" : vector(0 * millimeter, m3_nut / (2 * cos(30 * degree))),
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
        var m3_clear = getVar(context, "m3_clear", 3.4 * millimeter);
        var tol      = getVar(context, "tol", 0.3 * millimeter);

        // Pin diameter is sized 0.35mm smaller than the 3.4mm hole (approx 3.05mm) for an easy, non-binding slip fit
        var pin_rad  = (m3_clear - tol - 0.05 * millimeter) / 2;
        
        // Flattening the top and bottom (2.4mm height) creates a D-profile / double-flat shaft:
        // 1. It prints completely flat on the build plate with zero supports and zero bed-adhesion issues!
        // 2. Continuous perimeter wall loops run the entire 38mm length of the shaft for maximum shear strength!
        var flat_h     = 2.4 * millimeter; 
        var shaft_len  = 38 * millimeter; // Passes cleanly through the 32mm wide guide block in double-shear

        var xBase = 825 * millimeter;
        var yOffsets = [0 * millimeter];

        var idx = 0;
        for (var yOff in yOffsets)
        {
            idx += 1;

            // 1. Round Pin Shaft along X-axis (X = 825mm to 863mm)
            fCylinder(context, id + ("shaftCyl" ~ idx), {
                    "bottomCenter" : vector(xBase, yOff, 0 * millimeter),
                    "topCenter"    : vector(xBase + shaft_len, yOff, 0 * millimeter),
                    "radius"       : pin_rad
            });

            // 2. Bounding Box to Flatten Top & Bottom of Shaft (Z = -1.2mm to +1.2mm) & Bevel Tip
            var boundSk = newSketchOnPlane(context, id + ("boundSk" ~ idx), {
                    "sketchPlane" : plane(vector(xBase, yOff - 10 * millimeter, 0 * millimeter), vector(0, -1, 0), vector(1, 0, 0))
            });
            var h_z = flat_h / 2; // 1.2mm
            var b1 = vector(0 * millimeter,               -h_z);
            var b2 = vector(shaft_len - 1.5 * millimeter, -h_z);
            var b3 = vector(shaft_len,                    -0.5 * millimeter); // Tapered lead-in tip
            var b4 = vector(shaft_len,                     0.5 * millimeter);
            var b5 = vector(shaft_len - 1.5 * millimeter,  h_z);
            var b6 = vector(0 * millimeter,                h_z);

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
                    "corner1" : vector(xBase - 14 * millimeter, yOff - 9 * millimeter, -h_z),
                    "corner2" : vector(xBase,                   yOff + 9 * millimeter,  h_z)
            });

            // 4. Collar Stop Shoulder (6mm wide x 4mm long) so the pin seats cleanly against the guide block wall
            fCuboid(context, id + ("collar" ~ idx), {
                    "corner1" : vector(xBase,                yOff - 3 * millimeter, -h_z),
                    "corner2" : vector(xBase + 3 * millimeter, yOff + 3 * millimeter,  h_z)
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
        var desk_angle = getVar(context, "desk_angle", 15 * degree);
        
        var cx = -150 * millimeter;
        var cy = 0 * millimeter;

        var rec_half_w = 32 * millimeter; // 64mm total width
        var rec_height = 95 * millimeter; // 95mm tall housing
        var base_depth = 26 * millimeter + (rec_height * sin(desk_angle));

        // 1. Build the Solid Angled Housing Block
        var wedgeSketch = newSketchOnPlane(context, id + "wedgeSketch", {
                "sketchPlane" : plane(vector(cx - rec_half_w, cy, 0 * millimeter), vector(1, 0, 0), vector(0, 1, 0))
        });
        var w1 = vector(0 * millimeter, 0 * millimeter);
        var w2 = vector(base_depth,     0 * millimeter);
        var w3 = vector(base_depth - (rec_height * sin(desk_angle)), rec_height * cos(desk_angle));
        var w4 = vector(0 * millimeter, rec_height * cos(desk_angle));

        skLineSegment(wedgeSketch, "wBot",   { "start" : w1, "end" : w2 });
        skLineSegment(wedgeSketch, "wBack",  { "start" : w2, "end" : w3 });
        skLineSegment(wedgeSketch, "wTop",   { "start" : w3, "end" : w4 });
        skLineSegment(wedgeSketch, "wFront", { "start" : w4, "end" : w1 });
        skSolve(wedgeSketch);

        opExtrude(context, id + "extReceiver", {
                "entities" : qSketchRegion(id + "wedgeSketch"),
                "direction" : vector(1, 0, 0),
                "endBound" : BoundingType.BLIND,
                "endDepth" : rec_half_w * 2
        });

        // 2. Cut the Female Mega-Dovetail Slot + Tolerance
        var u_slide = vector(0, -sin(desk_angle), cos(desk_angle));
        var cornerOrigin = vector(cx, cy + base_depth, 0 * millimeter) - (8 * millimeter) * u_slide;

        var doveCutSketch = newSketchOnPlane(context, id + "doveCutSketch", {
                "sketchPlane" : plane(cornerOrigin, u_slide, vector(1, 0, 0))
        });

        var d_outer   = 2 * millimeter;
        var d_inner   = -(18 * millimeter) - tol;
        var half_neck = (13.0 * millimeter) + tol;
        var half_wide = (19.0 * millimeter) + tol;

        skLineSegment(doveCutSketch, "dBack",  { "start" : vector(-half_neck, d_outer), "end" : vector( half_neck, d_outer) });
        skLineSegment(doveCutSketch, "dRight", { "start" : vector( half_neck, d_outer), "end" : vector( half_wide, d_inner) });
        skLineSegment(doveCutSketch, "dFront", { "start" : vector( half_wide, d_inner), "end" : vector(-half_wide, d_inner) });
        skLineSegment(doveCutSketch, "dLeft",  { "start" : vector(-half_wide, d_inner), "end" : vector(-half_neck, d_outer) });
        skSolve(doveCutSketch);

        opExtrude(context, id + "extDoveCut", {
                "entities" : qSketchRegion(id + "doveCutSketch"),
                "direction" : u_slide,
                "endBound" : BoundingType.BLIND,
                "endDepth" : 79 * millimeter
        });

        opBoolean(context, id + "finalTestCut", {
                "tools" : qCreatedBy(id + "extDoveCut", EntityType.BODY),
                "targets" : qCreatedBy(id + "extReceiver", EntityType.BODY),
                "operationType" : BooleanOperationType.SUBTRACTION
        });
    });
    
