require "matrix"

class Vector
 def cross_product(other)
  return Vector[self[1] * other[2] - self[2] * other[1],
                self[2] * other[0] - self[0] * other[2],
                self[0] * other[1] - self[1] * other[0]]
 end
end

def calculateNormals(filename)

 vertices = []
 faces = []
 vertexNormalDirections = []

 header = ""
 inHeader = true

 File.open(filename) {|f|
  f.each_line {|l|
   if inHeader
    header += l
    if l[/property float(\d+)? z/]
     header += "property float nx\nproperty float ny\nproperty float nz\n"
    elsif l[/end_header/]
     inHeader = false
    end
   else
    if l[/^(-?\d+(\.\d+)?) (-?\d+(\.\d+)?) (-?\d+(\.\d+)?)[^0-9]+$/]
     vertices.push(Vector[$1.to_f, $3.to_f, $5.to_f])
     vertexNormalDirections.push(Vector[0.0, 0.0, 0.0])
    elsif l[/3 (\d+) (\d+) (\d+)/]
     faces.push([$1.to_i, $2.to_i, $3.to_i])
    end
   end
  }
 }
 puts vertices.size
 for f in faces
  #puts f.inspect
  v1 = vertices[f[1]] - vertices[f[0]]
  v2 = vertices[f[2]] - vertices[f[0]]
  normalDirection = v1.cross_product(v2)
  vertexNormalDirections[f[0]] += normalDirection
  vertexNormalDirections[f[1]] += normalDirection
  vertexNormalDirections[f[2]] += normalDirection
 end

 vertexNormals = vertexNormalDirections.collect {|v| v.normalize }

 File.open(filename.sub(".ply", "_withnormals.ply"), "w") {|f|
  f.write(header)
  for i in 0...vertices.length
   f.write(sprintf("%.5g %.5g %.5g %.5g %.5g %.5g\n", vertices[i][0], vertices[i][1], vertices[i][2], vertexNormals[i][0], vertexNormals[i][1], vertexNormals[i][2]))
  end
  for face in faces
   f.write("3 #{face[0]} #{face[1]} #{face[2]}\n")
  end
 }
end

calculateNormals("Code/teapot.ply")