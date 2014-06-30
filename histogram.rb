require 'chunky_png'

def count_colours(image)
	count = {}
	for y in 0...image.height
		for x in 0...image.width
			colour = image[x, y]
			count[colour] = 0 if !count[colour]
			count[colour] += 1
		end
	end
	area = image.width * image.height
	ratio = area.to_f / (area - count[ChunkyPNG::Color::TRANSPARENT])
	for col in count.keys
		count[col] = (count[col] * ratio).to_i
	end
	return count
end

def create_histogram_from_file(filename, histfilename)
	image = ChunkyPNG::Image.from_file(filename)
	count = count_colours(image)
	save_histogram(count, histfilename)
end

def save_histogram(count, histfilename)
	maxcount = 0
	for col in count.keys
		maxcount = count[col] if maxcount < count[col] && col != ChunkyPNG::Color::TRANSPARENT
	end
	histogram = ChunkyPNG::Image.new(count.keys.size, maxcount, ChunkyPNG::Color::TRANSPARENT)
	keys = count.keys.sort
	for i in 0...count.keys.size
		next if keys[i] == ChunkyPNG::Color::TRANSPARENT
		for j in 0...count[keys[i]]
			histogram[i, maxcount - j - 1] = keys[i]
		end
	end
	histogram.save(histfilename)
end

def area_difference(filename1, filename2, histfilename)
	h1 = count_colours(ChunkyPNG::Image.from_file(filename1))
	h2 = count_colours(ChunkyPNG::Image.from_file(filename2))
	colours = (h1.keys | h2.keys).sort
	newcount = {}
	for i in 0...colours.size
		diff = (h1[colours[i]] ? h1[colours[i]] : 0) - (h2[colours[i]] ? h2[colours[i]] : 0)
		diff = -diff if diff < 0
		newcount[colours[i]] = diff
	end
	puts newcount.inspect
	save_histogram(newcount, histfilename)
end

create_histogram_from_file("scolipede1.png", "scolipedehist1.png")
create_histogram_from_file("scolipede2.png", "scolipedehist2.png")

create_histogram_from_file("eevee1.png", "eeveehist1.png")
create_histogram_from_file("eevee2.png", "eeveehist2.png")

area_difference("scolipede1.png", "scolipede2.png", "scolipedediff.png")
area_difference("eevee1.png", "eevee2.png", "eeveediff.png")