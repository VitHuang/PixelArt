class Model
	def initialize(str)
		lines = str.split("\n")
		inHeader = true
		@header = ""
		@vertices = []
		@faces = []
		lines.each {|l|
			if inHeader
				@header += l + "\n"
				inHeader = false if l[/^\s*end_header/]
			else
				#if l[/(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/]
				if l[/^([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+) $/]
				#	@vertices.push(Vertex.new(@vertices.size, $1.to_f, $2.to_f, $3.to_f, $4.to_f, $6.to_f, $5.to_f, $7.to_f, $8.to_f))
					@vertices.push(Vertex.new(@vertices.size, $1.to_f, $2.to_f, $3.to_f, $4.to_f, $5.to_f, $6.to_f))
				elsif l[/3\s+(\d+)\s+(\d+)\s+(\d+)\s+6\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+([^ ]+)\s+(\d) $/]
					a = $1.to_i
					b = $2.to_i
					c = $3.to_i
					ua = $4.to_f
					va = $5.to_f
					ub = $6.to_f
					vb = $7.to_f
					uc = $8.to_f
					vc = $9.to_f
					t = $10.to_i
					a = setVertexTexture(@vertices[a], ua, va, t)
					b = setVertexTexture(@vertices[b], ub, vb, t)
					c = setVertexTexture(@vertices[c], uc, vc, t)
					@faces.push(Face.new(@vertices[a], @vertices[b], @vertices[c]))
				end
			end
		}
	end
	def calculateFeatureSize
		for f in @faces
			s = f.shortest
			f.a.fs = s if f.a.fs > s
			f.b.fs = s if f.b.fs > s
			f.c.fs = s if f.c.fs > s
		end
		@header.gsub!(/element vertex \d+/, "element vertex #{@vertices.size}")
		@header.gsub!(/element face \d+/, "element face #{@faces.size}")
	end
	def to_s
		return @header + @vertices.join("\n") + "\n" + @faces.join("\n")
	end
end

def setVertexTexture(vertex, u, v, texture)
	if texture == 0
		u *= 2
		v = (v - 0.5) * 2
	end
	if texture == 2
		u *= 4.0/3.0
		v = (v - 0.5) * 2
	end
	u = u / 2.0 + 0.5 * (texture % 2)
	v = v / 2.0 + 0.5 * (texture / 2)
	if vertex.updatedTexture
		if (vertex.u != u || vertex.v != v)
			vertex2 = Vertex.new(@vertices.length, vertex.pos.x, vertex.pos.y, vertex.pos.z, vertex.n.x, vertex.n.y, vertex.n.z, u, v)
			@vertices.push(vertex2)
			return vertex2.id
		end
	else
		vertex.u = u
		vertex.v = v
		vertex.updatedTexture = true
	end
	return vertex.id
end

class Vector
	attr_accessor :x
	attr_accessor :y
	attr_accessor :z
	def initialize(x, y, z)
		@x = x
		@y = y
		@z = z
	end
	def length
		return Math.sqrt(x * x + y * y + z * z)
	end
	def dot(other)
		return x * other.x + y * other.y + z * other.z
	end
	def +(other)
		return Vector.new(x + other.x, y + other.y, z + other.z)
	end
	def -(other)
		return Vector.new(x - other.x, y - other.y, z - other.z)
	end
	def *(val)
		return Vector.new(x * val, y * val, z * val)
	end
	def /(val)
		return Vector.new(x / val, y / val, z / val)
	end
end

class Face
	attr_reader :a
	attr_reader :b
	attr_reader :c
	attr_reader :shortest
	def initialize(a, b, c)
		@a = a
		@b = b
		@c = c
		@shortest = Line.new(c.pos, b.pos).pointDistance(a.pos)
		t = Line.new(a.pos, c.pos).pointDistance(b.pos)
		@shortest = t if @shortest > t
		t = Line.new(b.pos, a.pos).pointDistance(c.pos)
		@shortest = t if @shortest > t
	end
	def to_s
		return sprintf("3 %d %d %d", @a.id, @b.id, @c.id)
	end
end

class Vertex
	attr_accessor :id
	attr_reader :pos
	attr_reader :n
	attr_accessor :fs
	attr_accessor :u
	attr_accessor :v
	attr_accessor :updatedTexture
	def initialize(id, x, y, z, nx, ny, nz, u = 0.0, v = 0.0)
		@id = id
		@pos = Vector.new(x, y, z)
		@n = Vector.new(nx, ny, nz)
		@u = u
		@v = v
		@fs = 9999.0
		@fsp = 1.5
		@updatedTexture = false
	end
	def distance(other)
		return (other.pos - @pos).length
	end
	def to_s
		return sprintf("%.8f %.8f %.8f %.8f %.8f %.8f %.8f %.8f %.8f %.8f", @pos.x, @pos.y, @pos.z, @n.x, @n.y, @n.z, @u, @v, @fs, @fsp)
	end
end

class Line
	def initialize(a, b)
		@a = a
		d = b - a
		@n = d / d.length
	end
	def pointDistance(p)
		return ((@a - p) - @n * ((@a - p).dot(@n))).length
	end
end

model = nil
File.open("pikachu.ply") {|f|
	model = Model.new(f.read)
}
model.calculateFeatureSize
File.open("pikachu2.ply", "wb") {|f|
	f.write(model.to_s)
}