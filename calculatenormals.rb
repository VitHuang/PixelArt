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
 class Vertex
  attr_accessor :coords
  attr_accessor :normal
  attr_accessor :texCoords
  def initialize(coords, normal = Vector[0.0, 0.0, 0.0], texCoords = nil)
   @coords = coords
   @normal = normal
   @texCoords = texCoords
  end
 end
 attr_accessor :vertices
 attr_accessor :faces
 attr_accessor :plyHeader
 def initialize
  @vertices = []
  @faces = []
  @plyHeader = ""
 end
end

def loadObj(filename)
 model = Model.new
 vertices = []
 texCoords = []
 verticesWithTexture = []
 vertexPairs = {}
 currentVertex = 0
 File.open(filename) {|f|
  f.each_line {|l|
   if l[/v\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/]
    vertices.push(Vector[$1.to_f, $3.to_f, $5.to_f])
   elsif l[/vt\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)/]
    texCoords.push(Vector[$1.to_f, $3.to_f])
   elsif l[/f\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)(\s+(\d+)\/(\d+))?/]
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
	 model.faces.push([model.faces.last[0], model.faces.last[2], vertexPairs[pair]])
	end
   end
  }
 }
 for v in verticesWithTexture
  model.vertices.push(Model::Vertex.new(v[0], Vector[0.0, 0.0, 0.0], v[1]))
 end
 model.plyHeader = "ply\nformat ascii 1.0\nelement vertex #{model.vertices.size}\n" +
 "property float x\nproperty float y\nproperty float z\nproperty float nx\nproperty float ny\nproperty float nz\n" +
 "property float u\nproperty float v\nelement face #{model.faces.size}\nproperty list uint8 int32 vertex_indices\nend_header"
 return model
end

def loadPly(filename)

 model = Model.new
 model.plyHeader = ""
 inHeader = true

 File.open(filename) {|f|
  f.each_line {|l|
   if inHeader
    model.plyHeader += l
    if l[/property float(\d+)? z/]
     model.plyHeader += "property float nx\nproperty float ny\nproperty float nz\n"
    elsif l[/end_header/]
     inHeader = false
    end
   else
    if l[/^(-?\d+(\.\d+)?) (-?\d+(\.\d+)?) (-?\d+(\.\d+)?)[^0-9]+$/]
     model.vertices.push(Model::Vertex.new(Vector[$1.to_f, $3.to_f, $5.to_f]))
    elsif l[/3 (\d+) (\d+) (\d+)/]
     model.faces.push([$1.to_i, $2.to_i, $3.to_i])
    end
   end
  }
 }
 return model
end

def calculateNormalsObj(filename)
 model = loadObj(filename)
 calculateNormals(model)
 savePly(model, filename.sub(".obj", "_withnormals.ply"))
end

def calculateNormalsPly(filename)
 model = loadPly(filename)
 calculateNormals(model)
 savePly(model, filename.sub(".ply", "_withnormals.ply"))
end

def savePly(model, filename)
 File.open(filename, "w") {|f|
  f.write(model.plyHeader) if model.plyHeader
  for v in model.vertices
   f.write(sprintf("%.5f %.5f %.5f %.5f %.5f %.5f", v.coords[0], v.coords[1], v.coords[2], v.normal[0], v.normal[1], v.normal[2]))
   if v.texCoords
    f.write(sprintf(" %.5f %.5f", v.texCoords[0], v.texCoords[1]))
   end
   f.write("\n")
  end
  for face in model.faces
   f.write("3 #{face[0]} #{face[1]} #{face[2]}\n")
  end
 }
end

def calculateNormals(model)
 for f in model.faces
  v1 = model.vertices[f[1]].coords - model.vertices[f[0]].coords
  v2 = model.vertices[f[2]].coords - model.vertices[f[0]].coords
  normalDirection = v1.cross_product(v2)
  model.vertices[f[0]].normal += normalDirection
  model.vertices[f[1]].normal += normalDirection
  model.vertices[f[2]].normal += normalDirection
 end
 
 for v in model.vertices
  v.normal = v.normal.normalize
 end
 
 return model

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

calculateNormalsObj("teapot.obj")