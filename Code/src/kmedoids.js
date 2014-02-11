function randomMedoids(points, k) {
   var medoids = points.slice(0); // copy
   medoids.sort(function() {
      return (Math.round(Math.random()) - 0.5);
   });
   return medoids.slice(0, k);
}

function distance(a, b) {
	var d = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	return d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
}

function closestMedoid(point, medoids) {
   var min = Infinity,
       index = 0;
   for (var i = 0; i < medoids.length; i++) {
      var dist = distance(point, medoids[i]);
      if (dist < min) {
         min = dist;
         index = i;
      }
   }
   return index;
}

function kMedoids(points, k) {

   var medoids = randomMedoids(points, k);
   var assignment = new Array(points.length);
   var clusters = new Array(k);

   var iterations = 0;
   var movement = true;
   while (movement) {
      // update point-to-medoid assignments
      for (var i = 0; i < points.length; i++) {
         assignment[i] = closestMedoid(points[i], medoids);
      }

      // update location of each medoid
      movement = false;
      for (var j = 0; j < k; j++) {
         var assigned = [];
		 var costs = [];
         for (var i = 0; i < assignment.length; i++) {
            if (assignment[i] == j) {
               assigned.push(points[i]);
            }
         }

         if (!assigned.length) {
            continue;
         }
		 
		 var bestCost = Infinity;
		 var bestIndex = 0;
		 for (var i = 0; i < assigned.length; i++) {
			var cost = distance(medoids[j], assigned[i]);
			for (var m = 0; m < assigned.length; m++) {
			   cost += distance(assigned[i], assigned[m]);
			}
			if (cost < bestCost) {
			   bestCost = cost;
			   bestIndex = i;
			}
		 }
		 if (medoids[j][0] != assigned[bestIndex][0] || medoids[j][1] != assigned[bestIndex][1] || medoids[j][2] != assigned[bestIndex][2]) {
			medoids[j] = assigned[bestIndex];
			movement = true;
		 }
		 clusters[j] = assigned;
      }
   }
   return clusters;
}