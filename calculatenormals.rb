require "matrix"
require 'minitest/autorun'

class Vector
 def cross_product(other)
  return Vector[self[1] * other[2] - self[2] * other[1],
                self[2] * other[0] - self[0] * other[2],
                self[0] * other[1] - self[1] * other[0]]
 end
end


class Model
 attr_accessor :vertexCoords
 attr_accessor :vertexNormals
 attr_accessor :texCoords
 attr_accessor :faces
end

def loadObj(filename)
 model = Model.new
 vertices = []
 texCoords = []
 verticesWithTexture = []
 vertexPairs = {}
 currentVertex = 1
 File.open(filename) {|f|
  f.each_line {|l|
   if l[/v (-?\d+(\.\d+)?) (-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/]
    vertices.push(Vector[$1.to_f, $3.to_f, $4.to_f])
   elsif l[/vt (-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/]
    texCoords.push(Vector[$1.to_f, $3.to_f])
   elsif l[/f (\d+)\/(\d+) (\d+)\/(\d+) (\d+)\/(\d+)( (\d+)\/(\d+))?/]
    face = []
    for pair in [[$1.to_i, $2.to_i], [$3.to_i, $4.to_i], [$5.to_i, $6.to_i]]
     if (!vertexPairs[pair])
	  vertexPairs[pair] = currentVertex
	  currentVertex += 1
	  verticesWithTexture.push([vertices[pair[0] - 1], texCoords[pair[1] - 1]])
	 end
	 face.push(vertexPairs[pair])
	end
    model.faces.push(face)
	if $7
	 pair = [$8.to_i, $9.to_i]
	 if (!vertexPairs[pair])
	  vertexPairs[pair] = currentVertex
	  currentVertex += 1
	  verticesWithTexture.push([vertices[pair[0] - 1], texCoords[pair[1] - 1]])
	 end
	 model.faces.push(model.faces.last[0], model.faces.last[2], vertexPairs[pair])
	end
   end
  }
 }
 for v in verticesWithTexture
  model.vertexCoords.push(v[0])
  model.texCoords.push(v[1])
 end
 return model
end

def loadPly(filename)
 
end

def calculateNormalsObj(filename)
 model = loadObj(filename)
end

def calculateNormalsPly(filename)
 model = loadPly(filename)
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

class VectorTest < Minitest::Test

def test_cross_product
 v1 = Vector[2.0, 3.0, 4.0]
 v2 = Vector[5.0, 6.0, 7.0]
 v3 = v1.cross_product(v2)
 v4 = v2.cross_product(v1)
 answer = Vector[-3.0, 6.0, -3.0]
 neganswer = Vector[-answer[0], -answer[1], -answer[2]]
 assert_equal(v3, answer)
 assert_equal(v4, neganswer)
end

end

#calculateNormals("Code/teapot.ply")